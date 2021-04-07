import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { LotusService } from './lotus.service';

@Module({
  imports: [ConfigurationModule],
  providers: [LotusService],
  exports: [LotusService],
})
export class LotusModule {}
