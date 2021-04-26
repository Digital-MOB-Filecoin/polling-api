import { HttpService, Inject, Injectable } from "@nestjs/common";
import { Channel, Message } from "amqplib";
import { InjectRepository } from "@nestjs/typeorm";

import { AppConfig } from "src/modules/configuration/configuration.service";
import { LotusService } from "src/modules/lotus/lotus.service";
import { RabbitMQService } from "src/modules/rabbitmq/rabbitmq.service";
import { IConsumer } from "src/modules/rabbitmq/rabbitmq.types";
import { getRepository, In, Repository } from 'typeorm';

import { Buckets, KeyInfo, PrivateKey } from '@textile/hub';
import { Poll } from "./poll.entity";
import { Vote } from "../voters/vote.entity";
import { MultisigInfo } from "../snapshot/multisigInfo.entity";
import { MultisigRelatedAddress } from "../snapshot/multisigRelatedAddress.entity";

@Injectable()
export class MultisigVoteConsumer implements IConsumer {
  public queue = 'multisigVote'

  constructor(
    @InjectRepository(Poll)
    private pollsRepository: Repository<Poll>,
    @InjectRepository(MultisigInfo)
    private multisigInfoRepository: Repository<MultisigInfo>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(MultisigRelatedAddress)
    private multisigRelatedAddressRepository: Repository<MultisigRelatedAddress>,
    protected readonly config: AppConfig,
    protected lotus: LotusService,
    @Inject('ASYNC_RABBITMQ_CONNECTION') protected readonly rabbitMQService: RabbitMQService,
  ) { }

  public async exec(msg: string, channel: Channel, brokerMsg: Message) {
    try {
      const message = JSON.parse(msg);
      const { voteId, pollId, address, extraAddresses } = message;

      const poll = await this.pollsRepository.findOne({ where: { id: pollId } });
      try {
        //check address type and ensure we proceed with a f0 address
        let addressId = ''
        if (address.indexOf('f0') === 0) {
          addressId = address;
        } else {
          addressId = await this.lotus.walletProvider.lookupId(address)
        }
        //check if all the multisig addresses specified by the voter are in the multisig snapshot
        const multisigsInSnapshot = await this.multisigInfoRepository.find({ where: { multisigAddressId: In(extraAddresses), pollId: poll.id, height: poll.snapshotHeight } });
        const multisigAddressIdsInSnapshot = multisigsInSnapshot.map(multisig => multisig.multisigAddressId);
        if (multisigsInSnapshot.length != extraAddresses.length) {
          const multisigsToAddToSnapshot = extraAddresses.filter(addressId => multisigAddressIdsInSnapshot.indexOf(addressId) === -1)

          for (let i = 0; i < multisigsToAddToSnapshot.length; i++) {
            try {
              const multisigAddress = multisigsToAddToSnapshot[i];
              const multisigState = await this.lotus.client.state.readState(multisigAddress);
              if (multisigState.State['Signers'] && multisigState.State['NumApprovalsThreshold']) {
                const multisig = new MultisigInfo();
                multisig.multisigAddressId = multisigAddress;
                multisig.pollId = pollId;
                multisig.signerTreshold = multisigState.State['NumApprovalsThreshold'];
                multisig.balance = multisigState.Balance;
                multisig.height = poll.snapshotHeight;
                multisig.relatedAddresses = [];

                for (let j = 0; j < multisigState.State['Signers'].length; j++) {
                  const signerAddressId = multisigState.State['Signers'][j];
                  const signer = new MultisigRelatedAddress();
                  signer.addressId = signerAddressId;
                  signer.height = poll.snapshotHeight;

                  await this.multisigRelatedAddressRepository.save(signer);
                  multisig.relatedAddresses.push(signer);
                }

                await this.multisigInfoRepository.save(multisig);
              }
            } catch (e) {

            }
          }
        }

        //check if tresholds are reached in the associated multisigs
        //get list of multisigs in which the voter is a signer
        const associatedMultisigs = await this.multisigRelatedAddressRepository.query(`select mi."id", mi."multisigAddressId", mi."signerTreshold", mi."balance" from multisig_related_address ma join multisig_info mi on ma."multisigId"=mi.id  where mi."tresholdReached" = false and ma."addressId"=$1 and mi."pollId"=$2 and mi.height=$3;`, [
          addressId, poll.id, poll.snapshotHeight
        ]);

        for (let i = 0; i < associatedMultisigs.length; i++) {
          const multisig = associatedMultisigs[i];
          const multisigSigners = await this.multisigRelatedAddressRepository.find({ where: { multisigId: multisig.id, height: poll.snapshotHeight } })
          let signersList = multisigSigners.map(signer => signer.addressId);
          const robustSignerAddresses = [];
          for (let j = 0; j < signersList.length; j++) {
            try {
              const signerAddress = await this.lotus.client.state.accountKey(signersList[j]);
              robustSignerAddresses.push(signerAddress);
            } catch (e) { }
          }
          signersList = signersList.concat(robustSignerAddresses);

          const votes = await this.voteRepository.find({ where: { address: In(signersList), pollId: poll.id }, order: { createdAt: "ASC" } });
          const optionVoteCount = {};
          for (let j = 0; j < votes.length; j++) {
            const vote = votes[j];
            if (!optionVoteCount[vote.optionId]) {
              optionVoteCount[vote.optionId] = 1;
            } else {
              optionVoteCount[vote.optionId]++;
            }
            if (optionVoteCount[vote.optionId] >= multisig.signerTreshold) {
              //threshold met, we need to cast the multisig vote and mark it in the multisig
              const multisigVote = new Vote();

              multisigVote.pollId = poll.id;
              multisigVote.address = multisig.multisigAddressId;
              multisigVote.signerAddress = 'multisig';
              multisigVote.optionId = vote.optionId;
              multisigVote.constituentGroupId = 0;
              multisigVote.balance = multisig.balance;
              multisigVote.signature = 'multisig';
              multisigVote.lockedBalance = "0";
              multisigVote.power = "0";

              await this.voteRepository.save(multisigVote);

              await this.multisigInfoRepository.createQueryBuilder()
                .update()
                .set({ tresholdReached: true })
                .where(`id = :id`, { id: multisig.id })
                .execute();

              break;
            }
          }
        }

      } catch (e) {
        console.log(e);
      }

      channel.ack(brokerMsg);
    } catch (e) {
      console.log(e);
      channel.ack(brokerMsg);
      this.rabbitMQService.retry('poll', this.queue, msg).catch(() => { });
    }
  }
}