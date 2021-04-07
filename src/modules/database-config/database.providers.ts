import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../configuration/configuration.service';
import { User } from '../users/user.entity';
import { Poll } from '../polls/poll.entity';
import { Option } from '../polls/option.entity';
import { ConstituentGroup } from '../voters/constituentGroup.entity';
import { Voter } from '../voters/voter.entity';
import { Vote } from '../voters/vote.entity';
import { VoteResult } from '../polls/voteResult.entity';
import { MinerInfo } from '../snapshot/minerInfo.entity';
import { MinerRelatedAddress } from '../snapshot/minerRelatedAddress.entity';

// TODO: Add db entities here
const entities = [User, Poll, Option, ConstituentGroup, Voter, Vote, VoteResult, MinerInfo, MinerRelatedAddress];

@Injectable()
export class TypeOrmDefaultConfigService implements TypeOrmOptionsFactory {
  constructor(protected readonly config: AppConfig) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      synchronize: true,
      autoLoadEntities: false,
      logging: 'all',
      entities,
      ...this.config.values.database,
    };
  }
}
