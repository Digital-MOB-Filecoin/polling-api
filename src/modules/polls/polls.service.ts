import {
  HttpException,
  HttpService,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getRepository, In, MoreThanOrEqual, Repository } from 'typeorm';
import {
  ConstituentGroup,
  GroupType,
  VoteType,
} from '../voters/constituentGroup.entity';
import { Vote } from '../voters/vote.entity';
import { Option } from './option.entity';
import { Poll, Status } from './poll.entity';
import { VoteParamsDto } from './polls.dto';
import { Voter } from '../voters/voter.entity';
import { VoteResult } from './voteResult.entity';
import { AppConfig } from '../configuration/configuration.service';
import { LotusService } from '../lotus/lotus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SnapshotService } from '../snapshot/snapshot.service';
import { MinerInfo } from '../snapshot/minerInfo.entity';
import { parseIssue } from './polls.utils';
import * as BN from 'bn.js';
import {
  Buckets,
  Client,
  createUserAuth,
  KeyInfo,
  PrivateKey,
  UserAuth,
} from '@textile/hub';
import { Actor } from 'filecoin.js/builds/dist/providers/Types';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { MultisigInfo } from '../snapshot/multisigInfo.entity';
import { MultisigRelatedAddress } from '../snapshot/multisigRelatedAddress.entity';

@Injectable()
export class PollsService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(Poll)
    private pollsRepository: Repository<Poll>,
    @InjectRepository(ConstituentGroup)
    private constituentGroupRepository: Repository<ConstituentGroup>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Voter)
    private voterRepository: Repository<Voter>,
    @InjectRepository(VoteResult)
    private voteResultRepository: Repository<VoteResult>,
    @InjectRepository(MultisigInfo)
    private multisigInfoRepository: Repository<MultisigInfo>,
    @InjectRepository(MultisigRelatedAddress)
    private multisigRelatedAddressRepository: Repository<MultisigRelatedAddress>,
    protected snapshotService: SnapshotService,
    protected readonly config: AppConfig,
    protected lotus: LotusService,
    private eventEmitter: EventEmitter2,
    @Inject('ASYNC_RABBITMQ_CONNECTION')
    protected readonly rabbitMQService: RabbitMQService,
  ) {}

  createMessageToSign(id: number, name: string) {
    return Buffer.from(`${id} - ${name}`).toString('hex');
  }

  async testTextile() {
    const keyInfo: KeyInfo = {
      key: this.config.values.textile.key,
      secret: this.config.values.textile.secret,
    };

    console.log('keyInfo', keyInfo);
    const identityString = this.config.values.textile.identity;
    console.log('identityString', identityString);
    const restored = PrivateKey.fromString(identityString);
    console.log('restored pk', restored);

    try {
      const buckets = await Buckets.withKeyInfo(keyInfo);
      console.log('got buckets');
      await buckets.getToken(restored);
      console.log('got token');
      const { root } = await buckets.getOrCreate(`signatures-test`);
      console.log('created bucket');
      console.log(root);
      if (!root) throw new Error('bucket not created');
      const bucketKey = root.key;
      console.log('bucket key', bucketKey);
    } catch (e) {
      console.log('error', e);
    }
  }

  async testSnapshot() {
    const poll = await this.pollsRepository.findOne(1);
    this.eventEmitter.emit('getSnapshot', poll);
  }

  async previewIssue(issueId: string) {
    try {
      const getIssuesReq = await this.httpService
        .get(
          `https://api.github.com/repos/filecoin-project/community/contents/polls`,
          {
            auth: {
              username: this.config.values.github.user,
              password: this.config.values.github.token,
            },
          },
        )
        .toPromise();

      let issueBody = null;
      const issues = getIssuesReq.data;
      if (!issues || !Array.isArray(issues))
        return { message: 'Malformed issue' };

      for (let i = 0; i < issues.length; i++) {
        try {
          if (issues[i].name == issueId) {
            issueBody = await this.httpService
              .get(issues[i].download_url)
              .toPromise();
          }
        } catch (e) {}
      }

      if (!issueBody) return { message: 'Malformed issue' };
      //    const getIssueReq = await this.httpService.get(`https://api.github.com/repos/${this.config.values.github.user}/${this.config.values.github.repo}/issues/${issueId}`).toPromise();
      return parseIssue(issueBody.data, this.config.values.issueParser);
    } catch (e) {
      if (e.response && e.response.status === 404)
        return { message: 'Issue not found' };
      return { message: 'Malformed issue' };
    }
  }

  async getPoll(id: number) {
    const poll = await this.pollsRepository.findOne({
      where: { id: id },
      relations: ['options', 'constituentGroups'],
    });
    if (!poll) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid id',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    poll.constituentGroups.sort((a, b) => {
      if (a.position < b.position) return -1;
      if (a.position > b.position) return 1;
      return 0;
    });

    const allConstituentGroups = await this.constituentGroupRepository.find({
      order: { position: 'ASC' },
    });
    allConstituentGroups.forEach((cgroup: any) => {
      cgroup.enabled = false;
      poll.constituentGroups.forEach((pcgroup) => {
        if (pcgroup.id === cgroup.id) cgroup.enabled = true;
      });
    });

    poll.constituentGroups = allConstituentGroups;

    poll.options.forEach((option) => {
      option.encodedMessageToSign = this.createMessageToSign(id, option.name);
    });

    const voteResultsDb = await this.voteResultRepository.find({ pollId: id });
    const voteResults = {};
    voteResultsDb.forEach((res: VoteResult) => {
      if (!voteResults[res.constituentGroupId])
        voteResults[res.constituentGroupId] = {};
      voteResults[res.constituentGroupId][res.optionId] = {
        value: res.value,
        unit: res.unit,
        valueAux: res.valueAux,
        unitAux: res.unitAux,
      };
    });

    poll.voteResults = voteResults;
    return poll;
  }

  async getPollsList() {
    const polls = await this.pollsRepository.find({ order: { id: 'DESC' } });
    return polls;
  }

  async getPollsListActive() {
    const polls = await this.pollsRepository.find({
      where: { end: MoreThanOrEqual('NOW()') },
      order: { id: 'DESC' },
    });
    return polls;
  }

  async getConstituentGroupVoteList(id: number, constituentGroupId: number) {
    const poll = await this.pollsRepository.findOne({ where: { id: id } });
    if (!poll) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid id',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const constituentGroup = await this.constituentGroupRepository.findOne({
      id: constituentGroupId,
    });
    if (!constituentGroup) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid constituent group id',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let votes = getRepository(Vote).createQueryBuilder('vote');

    if (constituentGroup.identifier === 'tokenholders') {
      votes = votes.where(
        'vote.pollId = :id and (vote.balance > 0 or vote.lockedBalance > 0) and vote.constituentGroupId = 0',
        {
          id: id,
        },
      );
    }
    if (constituentGroup.identifier === 'storageminers') {
      votes = votes.where(
        'vote.pollId = :id and vote.power > 0 and vote.constituentGroupId = 0',
        {
          id: id,
        },
      );
    }
    if (constituentGroup.groupType !== GroupType.DEFAULT) {
      if (constituentGroup.voteType === VoteType.SIMPLE) {
        votes = votes.where(
          'vote.pollId = :id and vote.constituentGroupId = :constituentGroupId',
          {
            id: id,
            constituentGroupId: constituentGroup.id,
          },
        );
      }
      if (constituentGroup.voteType === VoteType.WEIGHTED_BY_BALANCE) {
        votes = votes.where(
          'vote.pollId = :id and vote.constituentGroupId = :constituentGroupId and (vote.balance > 0 or vote.lockedBalance > 0)',
          {
            id: id,
            constituentGroupId: constituentGroup.id,
          },
        );
      }
      if (constituentGroup.voteType === VoteType.WEIGHTED_BY_POWER) {
        votes = votes.where(
          'vote.pollId = :id and vote.constituentGroupId = :constituentGroupId and vote.power > 0',
          {
            id: id,
            constituentGroupId: constituentGroup.id,
          },
        );
      }
    }
    return await votes.getMany();
  }

  async voteInPoll(id: number, params: VoteParamsDto) {
    const poll = await this.pollsRepository.findOne({
      where: { id: id },
      relations: ['options', 'constituentGroups'],
    });
    if (!poll) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid id',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (poll.status !== Status.OPEN) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Voting not open',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const option = poll.options.find((el: Option) => params.option === el.name);
    if (!option) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid option',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let vote = await this.voteRepository.findOne({
      pollId: id,
      address: params.address,
    });
    if (vote) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'This address already voted in this poll',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    vote = new Vote();

    try {
      const sigBuffer = Buffer.from(params.signature, 'hex');

      const sig = {
        Type: sigBuffer[0],
        Data: Buffer.from(sigBuffer.slice(1)).toString('base64'),
      };

      const message = `${id} - ${params.option}`;
      const check = await this.lotus.walletProvider.verify(
        params.address,
        Buffer.from(message),
        sig,
      );
      if (!check) {
        throw new Error('Signature invalid');
      }
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const voter = await this.voterRepository.findOne({
      address: params.address,
    });
    let voterGroupId = 0;
    if (voter) {
      voterGroupId = voter.constituentGroupId;
    }
    vote.pollId = id;
    vote.address = params.address;
    vote.signerAddress = params.address;
    vote.optionId = option.id;
    vote.constituentGroupId = voterGroupId;

    let accountState: Actor;
    try {
      accountState = await this.lotus.walletProvider.getActor(
        params.address,
        JSON.parse(poll.snapshotTipsetKey),
      );

      vote.balance = accountState.Balance.toString();
    } catch (e) {
      console.log(e);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error:
            'Error retrieving address for voting. This address is not on chain at the specified snapshot height.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    vote.lockedBalance = '0';
    vote.power = '0';

    let voteAggregatedBalance = new BN(accountState.Balance.toString());
    let voteAggregatedPower = new BN(0);
    let voteAggregatedLockedBalance = new BN(0);

    const signature: any = {};
    signature['version'] = 1;
    signature['signer'] = params.address;
    signature['address'] = params.address;
    signature['pollId'] = id;
    signature['constituentGroupId'] = vote.constituentGroupId;
    signature['optionName'] = option.name;
    signature['message'] = this.createMessageToSign(id, option.name);
    signature['signature'] = params.signature;
    signature['balance'] = voteAggregatedBalance.toString();
    signature['lockedBalance'] = voteAggregatedLockedBalance.toString();
    signature['power'] = voteAggregatedPower.toString();

    vote.signature = JSON.stringify(signature);

    let addressId: string;
    try {
      addressId = await this.lotus.walletProvider.lookupId(params.address);
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error:
            'Error retrieving chain actor. This f0 address cannot be retrieved.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const minersInfo: MinerInfo[] = await this.snapshotService.getMinersInfo(
      addressId,
      poll.snapshotHeight,
    );

    await this.voteRepository.save(vote);

    await this.rabbitMQService.publish(
      'poll',
      'storeVote',
      JSON.stringify({
        voteId: vote.id,
        pollId: poll.id,
        bucketRootKey: poll.textileBucketRootKey,
        fileName: params.address,
        fileContent: vote.signature,
      }),
    );

    await this.rabbitMQService.publish(
      'poll',
      'multisigVote',
      JSON.stringify({
        address: params.address,
        extraAddresses: params.extraAddresses,
        voteId: vote.id,
        pollId: poll.id,
      }),
    );

    const voteConstituentGroup = poll.constituentGroups.find(
      (constituentGroup) => {
        if (constituentGroup.id === vote.constituentGroupId) return true;
        return false;
      },
    );

    for (let i = 0; i < minersInfo.length; i++) {
      const minerInfo = minersInfo[i];

      voteAggregatedPower = voteAggregatedPower.add(new BN(minerInfo.power));
      voteAggregatedLockedBalance = voteAggregatedLockedBalance.add(
        new BN(minerInfo.lockedBalance),
      );

      if (
        poll.countInMultipleGroups ||
        vote.constituentGroupId === 0 ||
        voteConstituentGroup.voteType === VoteType.WEIGHTED_BY_POWER ||
        voteConstituentGroup.voteType === VoteType.WEIGHTED_BY_BALANCE
      ) {
        const minerVote = new Vote();

        minerVote.pollId = id;
        minerVote.address = minerInfo.minerId;
        minerVote.signerAddress = params.address;
        minerVote.optionId = option.id;
        minerVote.constituentGroupId =
          vote.constituentGroupId === 0 ||
          voteConstituentGroup.voteType === VoteType.WEIGHTED_BY_POWER ||
          voteConstituentGroup.voteType === VoteType.WEIGHTED_BY_BALANCE
            ? vote.constituentGroupId
            : 0;
        minerVote.balance = '0';
        minerVote.lockedBalance = minerInfo.lockedBalance;
        minerVote.power = minerInfo.power;

        signature['address'] = minerInfo.minerId;
        signature['balance'] = 0;
        signature['lockedBalance'] = minerInfo.lockedBalance;
        signature['power'] = minerInfo.power;

        minerVote.signature = JSON.stringify(signature);
        try {
          await this.voteRepository.save(minerVote);

          await this.rabbitMQService.publish(
            'poll',
            'storeVote',
            JSON.stringify({
              voteId: minerVote.id,
              pollId: poll.id,
              bucketRootKey: poll.textileBucketRootKey,
              fileName: minerInfo.minerId,
              fileContent: minerVote.signature,
            }),
          );
        } catch (e) {
          console.log(`${minerInfo.minerId} already voted for ${id}`);
        }
      }
    }

    let retrieveConstituentGroupCriteria: any = { id: voterGroupId };
    if (voterGroupId !== 0 && poll.countInMultipleGroups)
      retrieveConstituentGroupCriteria = {
        where: [{ id: voterGroupId }, { groupType: GroupType.DEFAULT }],
      };
    if (voterGroupId === 0)
      retrieveConstituentGroupCriteria = { groupType: GroupType.DEFAULT };

    const constituentGroups = await this.constituentGroupRepository.find(
      retrieveConstituentGroupCriteria,
    );

    const castVotes = [];
    for (let i = 0; i < constituentGroups.length; i++) {
      const constituentGroup: ConstituentGroup = constituentGroups[i];

      const votesQuery = getRepository(Vote)
        .createQueryBuilder('vote')
        .select('SUM(vote.power)', 'totalPower')
        .addSelect('count(*)', 'votes')
        .addSelect('SUM(vote.balance)', 'totalBalance')
        .addSelect('SUM(vote.lockedBalance)', 'totalLockedBalance');

      let votes: any = {};

      if (constituentGroup.groupType === GroupType.LIST) {
        votes = await votesQuery
          .where(
            'vote.pollId = :id and vote.constituentGroupId = :constituentGroupId and vote.optionId = :optionId',
            {
              id: id,
              constituentGroupId: constituentGroup.id,
              optionId: option.id,
            },
          )
          .getRawOne();
      } else {
        votes = await votesQuery
          .where('vote.pollId = :id and vote.optionId = :optionId', {
            id: id,
            optionId: option.id,
          })
          .getRawOne();
      }

      let value = 0;
      let valueAux = 0;
      if (constituentGroup.voteType === VoteType.SIMPLE) {
        value = votes['votes'];
      }

      if (constituentGroup.voteType === VoteType.WEIGHTED_BY_BALANCE) {
        value = !votes['totalBalance'] ? '0' : votes['totalBalance'];
        valueAux = !votes['totalLockedBalance']
          ? '0'
          : votes['totalLockedBalance'];
      }

      if (constituentGroup.voteType === VoteType.WEIGHTED_BY_POWER) {
        value = !votes['totalPower'] ? '0' : votes['totalPower'];
      }

      await getRepository(VoteResult)
        .createQueryBuilder()
        .update(VoteResult)
        .set({ value, valueAux })
        .where(
          'pollId = :pollId and constituentGroupId = :constituentGroupId and optionId = :optionId',
          {
            pollId: id,
            constituentGroupId: constituentGroup.id,
            optionId: option.id,
          },
        )
        .execute();

      let castVoteValue = '1';
      let castVoteUnit = '';

      if (constituentGroup.groupType === GroupType.DEFAULT) {
        poll.constituentGroups.forEach((pollConstituentGroup) => {
          console.log(
            pollConstituentGroup.identifier,
            constituentGroup.voteType,
          );

          if (
            pollConstituentGroup.identifier == 'tokenholders' &&
            constituentGroup.voteType === VoteType.WEIGHTED_BY_BALANCE
          ) {
            castVoteValue = voteAggregatedBalance.toString();
            castVoteUnit = 'fil';

            if (castVoteValue !== '0') {
              castVotes.push({
                address: vote.address,
                value: castVoteValue,
                unit: castVoteUnit,
                option: option.name,
                constituentGroup: constituentGroup.name,
              });
            }
          }

          if (
            pollConstituentGroup.identifier == 'storageminers' &&
            constituentGroup.voteType === VoteType.WEIGHTED_BY_POWER
          ) {
            castVoteValue = voteAggregatedPower.toString();
            castVoteUnit = 'kb';

            if (castVoteValue !== '0') {
              castVotes.push({
                address: vote.address,
                value: castVoteValue,
                unit: castVoteUnit,
                option: option.name,
                constituentGroup: constituentGroup.name,
              });
            }
          }
        });
      } else if (castVoteValue !== '0') {
        castVotes.push({
          address: vote.address,
          value: castVoteValue,
          unit: castVoteUnit,
          option: option.name,
          constituentGroup: constituentGroup.name,
        });
      }
    }

    const voteResultsDb = await this.voteResultRepository.find({ pollId: id });
    const voteResults = {};
    voteResultsDb.forEach((res: VoteResult) => {
      if (!voteResults[res.constituentGroupId])
        voteResults[res.constituentGroupId] = {};
      voteResults[res.constituentGroupId][res.optionId] = {
        value: res.value,
        unit: res.unit,
        valueAux: res.valueAux,
        unitAux: res.unitAux,
      };
    });

    return {
      castVotes,
      voteResults,
    };
  }

  async updateSignaturesToV1() {
    const pollInfo = {};
    const votes = await this.voteRepository.find();
    for (let i = 0; i < votes.length; i++) {
      const vote = votes[i];

      if (!pollInfo[vote.pollId]) {
        const poll = await this.pollsRepository.findOne({
          where: { id: vote.pollId },
        });
        pollInfo[vote.pollId] = poll;
      }

      const signature = JSON.parse(vote.signature);
      signature.version = 1;
      signature.address = vote.address;
      signature.signer = vote.signerAddress;
      vote.signature = JSON.stringify(signature);

      await this.voteRepository.save(vote);

      await this.rabbitMQService.publish(
        'poll',
        'storeVote',
        JSON.stringify({
          voteId: vote.id,
          pollId: vote.pollId,
          bucketRootKey: pollInfo[vote.pollId].textileBucketRootKey,
          fileName: vote.address,
          fileContent: vote.signature,
        }),
      );
    }
  }
}
