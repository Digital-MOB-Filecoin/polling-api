import { MultisigInfo } from './multisigInfo.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class MultisigRelatedAddress {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    addressId: string;

    @Column()
    height: number;

    @Column({ nullable: true })
    multisigId: number;

    @ManyToOne(() => MultisigInfo, multisigInfo => multisigInfo.relatedAddresses)
    multisig: number;
}