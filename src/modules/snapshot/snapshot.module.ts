import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MinerInfo } from './minerInfo.entity';
import { LotusModule } from '../lotus/lotus.module';
import { MinerRelatedAddress } from './minerRelatedAddress.entity';
import { SnapshotService } from './snapshot.service';
import { SnapshotServiceSubscribers } from './snapshot.service.subscribers';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { GetSnapshotInfoConsumer } from './getSnapshotInfo';
import { ConfigurationModule } from '../configuration/configuration.module';

@Module({
  imports: [LotusModule, RabbitMQModule, ConfigurationModule, TypeOrmModule.forFeature([MinerInfo, MinerRelatedAddress])],
  providers: [SnapshotService, SnapshotServiceSubscribers, GetSnapshotInfoConsumer],
  exports: [SnapshotService],
})
export class SnapshotModule { }