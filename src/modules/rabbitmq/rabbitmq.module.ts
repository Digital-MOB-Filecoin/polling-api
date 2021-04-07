import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { RabbitMQService } from './rabbitmq.service';
import { AppConfig } from '../configuration/configuration.service'

@Module({
  imports: [ConfigurationModule],
  exports: ['ASYNC_RABBITMQ_CONNECTION'],
  providers: [{
      provide: 'ASYNC_RABBITMQ_CONNECTION',
      useFactory: async (appConfig: AppConfig) => {
        const rabbitMQ = new RabbitMQService({
          hostname: appConfig.values.rabbitmq.hostname,
          username: appConfig.values.rabbitmq.username,
          password: appConfig.values.rabbitmq.password,
          frameMax: 0,
        });
        await rabbitMQ.connect();
        await rabbitMQ.setup();
        return rabbitMQ;
      },
      inject: [AppConfig],
    },],
})
export class RabbitMQModule {}

