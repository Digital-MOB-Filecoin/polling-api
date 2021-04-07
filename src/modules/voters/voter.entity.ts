import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Voter {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    constituentGroupId: number;

    @Column()
    address: string;

    @Column({
        default: 1
    })
    weight: number;
}