import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { TypeOrmDefaultConfigService } from './database.providers';

@Module({
  imports: [ConfigurationModule],
  providers: [TypeOrmDefaultConfigService],
  exports: [TypeOrmDefaultConfigService],
})
export class DatabaseConfigModule {}
