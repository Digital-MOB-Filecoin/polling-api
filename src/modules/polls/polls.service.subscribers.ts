import { Inject, Injectable } from '@nestjs/common';

import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { StoreVoteConsumer } from './storeVote.consumer';

@Injectable()
export class PollsServiceSubscribers {

    constructor(
        protected readonly storeVoteConsumer: StoreVoteConsumer,

        @Inject('ASYNC_RABBITMQ_CONNECTION') protected readonly rabbitMQService: RabbitMQService,) {
    }

    async onModuleInit() {
        this.rabbitMQService.attachConsumer(this.storeVoteConsumer);
        console.log(`The module has been initialized.`);
    }
}