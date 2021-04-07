import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Poll } from './poll.entity';

@Entity()
export class VoteResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pollId: number;

  @Column()
  constituentGroupId: number;

  @Column()
  optionId: number;

  @Column({ type: "decimal", nullable: true })
  value: number;

  @Column()
  unit: string;

  @Column({ type: "decimal", nullable: true })
  valueAux: number;

  @Column({ nullable: true })
  unitAux: string;
}
