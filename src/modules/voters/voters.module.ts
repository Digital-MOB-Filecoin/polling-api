import { Module } from '@nestjs/common';
import { VotersController } from './voters.controller';
import { VotersService } from './voters.service';
import { Voter } from './voter.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConstituentGroup } from './constituentGroup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Voter, ConstituentGroup])],
  controllers: [VotersController],
  providers: [VotersService],
})
export class VotersModule { }
