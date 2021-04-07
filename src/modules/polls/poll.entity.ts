import { json } from 'express';
import { Entity, Column, OneToMany, ManyToMany, JoinTable, PrimaryGeneratedColumn } from 'typeorm';
import { ConstituentGroup } from '../voters/constituentGroup.entity';
import { Option } from './option.entity'

export enum Status {
    OPEN = "open",
    CLOSED = "closed",
    BUILDING_SNAPSHOT = "building_snapshot",
    PENDING = "pending"
}

@Entity()
export class Poll {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    issueLink: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    fileName: string;

    @Column({ nullable: true })
    userProfileName: string;

    @Column()
    description: string;

    @Column({ nullable: true })
    snapshotHeight: number;

    @Column({ nullable: true })
    snapshotMinerCount: number;

    @Column({ nullable: true })
    snapshotTipsetKey: string;

    @Column({ default: false })
    snapshotCreated: boolean;

    @Column({ nullable: true })
    textileBucketRootKey: string;

    @Column({ default: false })
    countInMultipleGroups: boolean;

    @Column()
    start: Date;

    @Column()
    end: Date;

    @Column({
        type: "enum",
        enum: Status,
        default: Status.PENDING
    })
    status: Status;

    @OneToMany(() => Option, option => option.poll)
    options: Option[];

    @ManyToMany(() => ConstituentGroup)
    @JoinTable()
    constituentGroups: ConstituentGroup[];

    voteResults: any;
}