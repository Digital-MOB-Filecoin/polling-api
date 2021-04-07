import { Inject, Injectable } from '@nestjs/common';

import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { GetSnapshotInfoConsumer } from './getSnapshotInfo';

@Injectable()
export class SnapshotServiceSubscribers {

    constructor(
        protected readonly getSnapshotInfoConsumer: GetSnapshotInfoConsumer,

        @Inject('ASYNC_RABBITMQ_CONNECTION') protected readonly rabbitMQService: RabbitMQService,) {
    }

    async onModuleInit() {
        this.rabbitMQService.attachConsumer(this.getSnapshotInfoConsumer);
        console.log(`The module has been initialized.`);
    }
}