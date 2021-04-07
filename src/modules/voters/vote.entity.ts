import { Entity, Column, PrimaryGeneratedColumn, Unique, DeleteDateColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity()
@Unique('uniqueVote', ['pollId', 'address', 'constituentGroupId'])
export class Vote {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    pollId: number;

    @Column()
    constituentGroupId: number;

    @Column()
    optionId: number;

    @Column()
    address: string;

    @Column({ nullable: true })
    signerAddress: string;

    @Column({ nullable: true })
    signature: string;

    @Column({ type: "decimal", nullable: true })
    power: string;

    @Column({ type: "decimal", nullable: true })
    balance: string;

    @Column({ type: "decimal", nullable: true })
    lockedBalance: string;

    @Column({ default: false })
    uploaded: boolean;

    @Column({ default: "" })
    textilePath: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}