import { HttpService, Inject, Injectable } from '@nestjs/common';
import { Channel, Message } from 'amqplib';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppConfig } from 'src/modules/configuration/configuration.service';
import { LotusService } from 'src/modules/lotus/lotus.service';
import { RabbitMQService } from 'src/modules/rabbitmq/rabbitmq.service';
import { IConsumer } from 'src/modules/rabbitmq/rabbitmq.types';
import { SnapshotService } from './snapshot.service';

@Injectable()
export class GetSnapshotInfoConsumer implements IConsumer {
  public queue = 'getSnapshotInfo';

  constructor(
    protected readonly config: AppConfig,
    protected lotus: LotusService,
    protected snapshotService: SnapshotService,
    @Inject('ASYNC_RABBITMQ_CONNECTION')
    protected readonly rabbitMQService: RabbitMQService,
  ) {}

  public async exec(msg: string, channel: Channel, brokerMsg: Message) {
    try {
      const message = JSON.parse(msg);

      const miner = message.miner;
      const minerPower = await this.lotus.walletProvider.minerPower(
        miner,
        message.tipset,
      );
      const power = minerPower.MinerPower.RawBytePower;

      const minerInfo = await this.lotus.walletProvider.minerInfo(
        miner,
        message.tipset,
      );
      const minerState = await this.lotus.walletProvider.readState(
        miner,
        message.tipset,
      );

      const minerBalance = minerState.Balance;
      const minerLockedFunds = minerState.State.LockedFunds;

      const relatedAddresses = [minerInfo.Owner];
      if (minerInfo.Owner !== minerInfo.Worker)
        relatedAddresses.push(minerInfo.Worker);

      await this.snapshotService.storeMinerInfo(
        relatedAddresses,
        miner,
        power,
        minerBalance,
        minerLockedFunds,
        message.snapshotHeight,
        message.pollId,
      );

      channel.ack(brokerMsg);
    } catch (e) {
      console.log(e);
      channel.ack(brokerMsg);
      this.rabbitMQService.retry('poll', this.queue, msg).catch(() => {});
    }
  }
}
