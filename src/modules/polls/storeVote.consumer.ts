import { HttpService, Inject, Injectable } from "@nestjs/common";
import { Channel, Message } from "amqplib";
import { InjectRepository } from "@nestjs/typeorm";

import { AppConfig } from "src/modules/configuration/configuration.service";
import { LotusService } from "src/modules/lotus/lotus.service";
import { RabbitMQService } from "src/modules/rabbitmq/rabbitmq.service";
import { IConsumer } from "src/modules/rabbitmq/rabbitmq.types";
import { getRepository, Repository } from 'typeorm';

import { Buckets, KeyInfo, PrivateKey } from '@textile/hub';
import { Poll } from "./poll.entity";
import { Vote } from "../voters/vote.entity";

@Injectable()
export class StoreVoteConsumer implements IConsumer {
  public queue = 'storeVote'

  constructor(
    @InjectRepository(Poll)
    private pollsRepository: Repository<Poll>,
    protected readonly config: AppConfig,
    protected lotus: LotusService,
    @Inject('ASYNC_RABBITMQ_CONNECTION') protected readonly rabbitMQService: RabbitMQService,
  ) { }

  public async exec(msg: string, channel: Channel, brokerMsg: Message) {
    try {
      const message = JSON.parse(msg);
      let { voteId, pollId, bucketRootKey, fileName, fileContent } = message;

      const keyInfo: KeyInfo = {
          key: this.config.values.textile.key,
          secret: this.config.values.textile.secret
      }

      const identityString = this.config.values.textile.identity;
      const restored = PrivateKey.fromString(identityString);

      try {
          const buckets = await Buckets.withKeyInfo(keyInfo);
          await buckets.getToken(restored);
          const { root, threadID } = await buckets.getOrCreate(`signatures-${pollId}`);
          if (!root) throw new Error('bucket not created');
          //const bucketKey = root.key; #this value is stored in the database as well

          const file = { path: `/${fileName}`, content: Buffer.from(fileContent) }
          const uploadInfo = await buckets.pushPath(bucketRootKey!, fileName, file)

          await getRepository(Vote)
              .createQueryBuilder("vote")
              .update(Vote)
              .set({ uploaded: true, textilePath: uploadInfo.path.path })
              .where("id = :id", { id: voteId })
              .execute();

      } catch (e) {
          console.log(e);
      }
      channel.ack(brokerMsg);
    } catch (e) {
      console.log(e);
      channel.ack(brokerMsg);
      this.rabbitMQService.retry('poll', this.queue, msg).catch(() => { });
    }
  }
}