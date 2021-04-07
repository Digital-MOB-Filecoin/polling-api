import { Channel, Message } from 'amqplib';

export interface IConsumer {
  queue: string;
  exec: ConsumerFunction;
}

export type ConsumerFunction = (
  msg: string,
  channel: Channel,
  brokerMsg: Message,
) => void;

export type ConnectionOptions = {
    hostname: string;
    username: string;
    password: string;
    frameMax: number;
  };