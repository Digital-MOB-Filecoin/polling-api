import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { MultisigRelatedAddress } from './multisigRelatedAddress.entity';

@Entity()
export class MultisigInfo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    multisigAddressId: string;

    @Column()
    height: number;

    @Column({ nullable: true })
    pollId: number;

    @Column({ type: "decimal", nullable: true })
    balance: string;

    @Column({ nullable: true })
    signerTreshold: number;

    @Column({ nullable: true, default: false })
    tresholdReached: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => MultisigRelatedAddress, multisigRelatedAddress => multisigRelatedAddress.multisig)
    relatedAddresses: MultisigRelatedAddress[];
}