import { HttpService, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Buckets, KeyInfo, PrivateKey } from '@textile/hub';
import { getRepository, Repository } from 'typeorm';
import { Vote } from '../voters/vote.entity';
import { Poll } from './poll.entity';
import {
  LotusClient,
  LotusWalletProvider,
  WsJsonRpcConnector,
} from 'filecoin.js';
import { AppConfig } from '../configuration/configuration.service';
import { LotusService } from '../lotus/lotus.service';
import { OnEvent } from '@nestjs/event-emitter';
import { SnapshotService } from '../snapshot/snapshot.service';
import { StoreVoteParams } from './polls.types';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class PollsServiceEvents {
  constructor(
    @InjectRepository(Poll)
    private pollsRepository: Repository<Poll>,
    protected snapshotService: SnapshotService,
    protected readonly config: AppConfig,
    protected lotus: LotusService,
    @Inject('ASYNC_RABBITMQ_CONNECTION')
    protected readonly rabbitMQService: RabbitMQService,
    private httpService: HttpService,
  ) {}

  @OnEvent('getSnapshot')
  async handleGetPollSnapshot(poll: Poll) {
    console.log('get snapshot');
    const wsConnector = new WsJsonRpcConnector({
      url: this.config.values.lotus.wsUrl,
      token: this.config.values.lotus.token,
    });

    const wsClient = new LotusClient(wsConnector);
    //const wsWalletProvider = new LotusWalletProvider(wsClient);
    const wsWalletProvider = this.lotus.walletProvider;

    const head = await wsWalletProvider.getHead();

    const keyInfo: KeyInfo = {
      key: this.config.values.textile.key,
      secret: this.config.values.textile.secret,
    };

    const identityString = this.config.values.textile.identity;
    const restored = PrivateKey.fromString(identityString);

    try {
      const buckets = await Buckets.withKeyInfo(keyInfo);
      await buckets.getToken(restored);
      const { root } = await buckets.getOrCreate(`signatures-${poll.id}`);
      if (!root) throw new Error('bucket not created');
      const bucketKey = root.key;
      poll.textileBucketRootKey = bucketKey;
    } catch (e) {
      console.log(e);
    }

    poll.snapshotHeight = head.Height;
    poll.snapshotCreated = false;

    const snapshotTipset = await wsWalletProvider.getTipSetByHeight(
      poll.snapshotHeight,
    );
    poll.snapshotTipsetKey = JSON.stringify(snapshotTipset.Cids);

    // const miners = await wsWalletProvider.listMiners(snapshotTipset.Cids);

    let miners = [];
    try {
      const getMinersReq = await this.httpService
        .get(`https://api.filecoin.energy/filchain/miners`)
        .toPromise();

      miners = getMinersReq.data;
    } catch (e) {
      console.log('failed to get miner list', e);
    }

    poll.snapshotMinerCount = miners.length;
    await this.pollsRepository.save(poll);

    console.log(miners.length);
    for (let i = 0; i < miners.length; i++) {
      await this.rabbitMQService.publish(
        'poll',
        'getSnapshotInfo',
        JSON.stringify({
          tipset: snapshotTipset.Cids,
          miner: miners[i].miner,
          snapshotHeight: poll.snapshotHeight,
          pollId: poll.id,
        }),
      );
    }
  }
}
