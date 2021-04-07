import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { MinerRelatedAddress } from './minerRelatedAddress.entity';

@Entity()
export class MinerInfo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    minerId: string;

    @Column()
    height: number;

    @Column({ nullable: true })
    pollId: number;

    @Column({ type: "decimal", nullable: true })
    power: string;

    @Column({ type: "decimal", nullable: true })
    balance: string;

    @Column({ type: "decimal", nullable: true })
    lockedBalance: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => MinerRelatedAddress, minerRelatedAddress => minerRelatedAddress.miner)
    relatedAddresses: MinerRelatedAddress[];
}