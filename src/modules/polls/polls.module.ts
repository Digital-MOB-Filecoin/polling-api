import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poll } from './poll.entity';
import { Option } from './option.entity';

import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';

import { ConstituentGroup } from '../voters/constituentGroup.entity';
import { Vote } from '../voters/vote.entity';
import { Voter } from '../voters/voter.entity';
import { VoteResult } from './voteResult.entity';
import { ConfigurationModule } from '../configuration/configuration.module';
import { LotusModule } from '../lotus/lotus.module';
import { SnapshotModule } from '../snapshot/snapshot.module';
import { PollsServiceCrons } from './polls.service.crons';
import { PollsServiceEvents } from './polls.service.events';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { PollsServiceSubscribers } from './polls.service.subscribers';
import { StoreVoteConsumer } from './storeVote.consumer'
import { MultisigVoteConsumer } from './multisigVote.consumer';
import { MultisigInfo } from '../snapshot/multisigInfo.entity';
import { MultisigRelatedAddress } from '../snapshot/multisigRelatedAddress.entity';

@Module({
    imports: [HttpModule, ConfigurationModule, RabbitMQModule, LotusModule, SnapshotModule, TypeOrmModule.forFeature([Poll, Option, ConstituentGroup, Vote, Voter, VoteResult, MultisigInfo, MultisigRelatedAddress])],
    providers: [PollsService, PollsServiceCrons, PollsServiceEvents, PollsServiceSubscribers, StoreVoteConsumer, MultisigVoteConsumer],
    exports: [PollsService],
    controllers: [PollsController],
})
export class PollsModule { }