import { Inject, Injectable } from '@nestjs/common';

import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { StoreVoteConsumer } from './storeVote.consumer';
import { MultisigVoteConsumer } from './multisigVote.consumer';


@Injectable()
export class PollsServiceSubscribers {

    constructor(
        protected readonly storeVoteConsumer: StoreVoteConsumer,
        protected readonly multisigVoteConsumer: MultisigVoteConsumer,


        @Inject('ASYNC_RABBITMQ_CONNECTION') protected readonly rabbitMQService: RabbitMQService,) {
    }

    async onModuleInit() {
        this.rabbitMQService.attachConsumer(this.storeVoteConsumer);
        this.rabbitMQService.attachConsumer(this.multisigVoteConsumer);

        console.log(`The module has been initialized.`);
    }
}