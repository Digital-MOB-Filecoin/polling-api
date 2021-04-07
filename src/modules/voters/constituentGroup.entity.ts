import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Unique } from 'typeorm';

export enum VoteType {
    SIMPLE = "simple",
    WEIGHTED = "weighted",
    WEIGHTED_BY_POWER = "weighted_by_power",
    WEIGHTED_BY_BALANCE = "weighted_by_balance"
}

export enum GroupType {
    LIST = "list",
    DEFAULT = "default",
}

export enum IdentifierType {
    STORAGE_CLIENTS = "storageclients",
    ECOSYSTEM_PARTNERS = "ecosystempartners",
    CORE_DEVS = "coredevs",
    APP_DEVS = "appdevs",
    TOKEN_HOLDERS = "tokenholders",
    STORAGE_MINERS = "storageminers",
}

@Entity()
export class ConstituentGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({
        type: "enum",
        enum: IdentifierType,
        unique: true,
    })
    identifier: string;

    @Column()
    description: string;

    @Column({nullable: true})
    position: number;

    @Column({nullable: true})
    unit: string;

    @Column({
        type: "enum",
        enum: VoteType,
        default: VoteType.SIMPLE
    })
    voteType: VoteType;

    @Column({
        type: "enum",
        enum: GroupType,
        default: GroupType.LIST
    })
    groupType: GroupType;

    votes: any;
}