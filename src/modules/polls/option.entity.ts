import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Poll } from './poll.entity';

@Entity()
export class Option {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Poll, poll => poll.options)
  poll: number;

  @Column()
  name: string;

  @Column()
  description: string;

  encodedMessageToSign: string;
}