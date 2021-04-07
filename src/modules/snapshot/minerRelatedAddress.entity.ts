import { MinerInfo } from './minerInfo.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class MinerRelatedAddress {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    addressId: string;

    @Column()
    height: number;

    @Column({ nullable: true })
    minerId: number;

    @ManyToOne(() => MinerInfo, minerInfo => minerInfo.relatedAddresses)
    miner: number;
}