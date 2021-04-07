import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './configuration';
import { DatabaseConfigModule } from './modules/database-config/database.module';
import { TypeOrmDefaultConfigService } from './modules/database-config/database.providers';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PollsModule } from './modules/polls/polls.module';
import { VotersModule } from './modules/voters/voters.module'
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: false,
      ignoreEnvVars: false,
      isGlobal: true,
      expandVariables: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [DatabaseConfigModule],
      useExisting: TypeOrmDefaultConfigService,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    PollsModule,
    VotersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
