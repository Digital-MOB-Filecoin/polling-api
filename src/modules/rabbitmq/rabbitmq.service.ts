
import * as amqplib from 'amqplib';

import { Logger } from '@nestjs/common';
import { Channel } from "amqplib";
import { ConnectionOptions, IConsumer } from './rabbitmq.types';

export class RabbitMQService {
  channel1: amqplib.Channel;
  channel2: amqplib.Channel;
  connection: amqplib.Connection;
  connectionOptions: ConnectionOptions;

  constructor(connectionOptions: ConnectionOptions) {
    this.connectionOptions = connectionOptions;
  }

  public async connect() {
    const { hostname, username, password, frameMax } = this.connectionOptions;
    this.connection = await amqplib.connect({
      hostname,
      username,
      password,
      frameMax,
    });
    this.channel1 = undefined;
  }

  public async setup() {
    await this.declareChannels();
    await this.declareExchanges('poll', 'direct')
    await this.declareQueue(this.channel1, 'poll', 'getSnapshotInfo', 'getSnapshotInfo');
    await this.declareQueue(this.channel2, 'poll', 'storeVote', 'storeVote');
    await this.declareQueue(this.channel2, 'poll', 'multisigVote', 'multisigVote');
  }

  public async declareExchanges(exchangeName: string, type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match') {
    await this.channel1.assertExchange(`${exchangeName}`, type);
    await this.channel1.assertExchange(`${exchangeName}-dlx`, type);
  }

  public async declareQueue(channel: Channel, exchange: string, queue: string, routingKey: string) {
    await channel.assertQueue(queue);
    await channel.assertQueue(`${queue}.dlx`, { messageTtl: 1000, deadLetterExchange: exchange, });
    await channel.bindQueue(queue, exchange, routingKey);
    await channel.bindQueue(`${queue}.dlx`, `${exchange}-dlx`, routingKey);
    Logger.log(`[RabbitMQ] queue ${queue} binded to exchange ${exchange}`);
  }

  public async publish(exchange: string, routingKey: string, msg: string) {
    this.channel1.publish(exchange, routingKey, Buffer.from(msg));
  }

  public async retry(exchange: string, routingKey: string, msg: string) {
    this.channel1.publish(`${exchange}-dlx`, routingKey, Buffer.from(msg));
  }

  public async attachConsumer(consumer: IConsumer) {
    let channel:amqplib.Channel;
    if (consumer.queue === 'getSnapshotInfo') channel = this.channel1;
    if (consumer.queue === 'storeVote') channel = this.channel2;
    if (consumer.queue === 'multisigVote') channel = this.channel2;

    await channel.assertQueue(consumer.queue);
    await channel.consume(consumer.queue, msg => {
        if (msg !== null) {
          consumer.exec(msg.content.toString(), channel, msg);
        }
      },
      { noAck: false },
    );
    Logger.log(`[RabbitMQ::attachConsumer] Consumer attached to queue ${consumer.queue}`,);
  }

  private onChannelClose() {
    console.log(`[RabbitMQ::onChannelClose]`);
  }

  private onChannelError(error) {
    console.log(`[RabbitMQ::onChannelError] ${error}`);
  }

  public async close() {
    await this.connection.close();

    this.connection = undefined;
    this.channel1 = undefined;
  }

  private async declareChannels() {
    this.channel1 = await this.connection.createChannel();
    await this.channel1.prefetch(20)
    this.channel1.on('error', this.onChannelError);
    this.channel1.on('close', this.onChannelClose);

    this.channel2 = await this.connection.createChannel();
    await this.channel2.prefetch(1)
    this.channel2.on('error', this.onChannelError);
    this.channel2.on('close', this.onChannelClose);
  }
}
