import { HttpService, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { getRepository, In, Repository } from 'typeorm';
import { ConstituentGroup, VoteType } from '../voters/constituentGroup.entity';
import { Option } from './option.entity';
import { Poll, Status } from './poll.entity';
import { VoteResult } from './voteResult.entity';
import { AppConfig } from '../configuration/configuration.service';
import { LotusService } from '../lotus/lotus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SnapshotService } from '../snapshot/snapshot.service';
import { parseIssue } from './polls.utils';
import { MinerInfo } from '../snapshot/minerInfo.entity';

@Injectable()
export class PollsServiceCrons {

    constructor(
        private httpService: HttpService,
        @InjectRepository(Poll)
        private pollsRepository: Repository<Poll>,
        @InjectRepository(Option)
        private optionsRepository: Repository<Option>,
        @InjectRepository(ConstituentGroup)
        private constituentGroupRepository: Repository<ConstituentGroup>,
        @InjectRepository(VoteResult)
        private voteResultRepository: Repository<VoteResult>,
        protected snapshotService: SnapshotService,
        protected readonly config: AppConfig,
        protected lotus: LotusService,
        private eventEmitter: EventEmitter2) {
    }


    @Cron(CronExpression.EVERY_10_MINUTES)
    async getPollsFromIssues() {
        console.log('get issues cron');
        const { approveLabel } = this.config.values.issueParser;

        let getIssuesReq: Observable<AxiosResponse<[]>>;
        //getIssuesReq = this.httpService.get(`https://api.github.com/repos/${this.config.values.github.user}/${this.config.values.github.repo}/issues?labels=${approveLabel}`);
        getIssuesReq = this.httpService.get(`https://api.github.com/repos/filecoin-project/community/contents/polls`, {
            auth: {
                username: this.config.values.github.user,
                password: this.config.values.github.token
            }
        });

        getIssuesReq.subscribe(async response => {
            const issues = response.data;
            if (!issues || !Array.isArray(issues)) return;
            for (let i = 0; i < issues.length; i++) {
                try {
                    const issue: any = issues[i];
                    console.log('parsing issue ' + issue.name);

                    let poll = await this.pollsRepository.findOne({ fileName: issue.name });
                    if (!poll) {
                        const issueBody = await this.httpService.get(issue.download_url, {
                            auth: {
                                username: this.config.values.github.user,
                                password: this.config.values.github.token
                            }
                        }).toPromise();

                        const {
                            description,
                            options,
                            startTime,
                            endTime,
                            constituents,
                            author,
                            discussion
                        } = parseIssue(issueBody.data, this.config.values.issueParser)

                        poll = new Poll();
                        poll.options = [];
                        for (let i = 0; i < options.length; i++) {
                            const option = new Option();
                            option.name = options[i].name;
                            option.description = options[i].description;
                            await this.optionsRepository.save(option);
                            poll.options.push(option);
                        }

                        let constituentGroups: ConstituentGroup[];

                        if (constituents.indexOf('all') >= 0) {
                            constituentGroups = await this.constituentGroupRepository.find();
                        } else {
                            constituentGroups = await this.constituentGroupRepository.find({
                                identifier: In(constituents)
                            });
                        }
                        poll.constituentGroups = constituentGroups;

                        if (constituents.indexOf('countInMultipleGroups') >= 0) {
                            poll.countInMultipleGroups = true;
                        }

                        poll.start = startTime;
                        poll.end = endTime;
                        poll.issueLink = discussion;
                        poll.userProfileName = author;

                        poll.description = description;
                        poll.fileName = issue.name;
                        poll.name = issue.name.substring(0, issue.name.length - 3)

                        poll = await this.pollsRepository.save(poll);

                        for (let i = 0; i < poll.options.length; i++) {
                            const option = poll.options[i];
                            for (let j = 0; j < poll.constituentGroups.length; j++) {
                                const constituentGroup = poll.constituentGroups[j];
                                const voteResult = new VoteResult();
                                voteResult.pollId = poll.id;
                                voteResult.optionId = option.id;
                                voteResult.constituentGroupId = constituentGroup.id;
                                voteResult.value = 0;
                                voteResult.valueAux = 0;

                                if (constituentGroup.voteType === VoteType.SIMPLE) {
                                    voteResult.unit = 'number';
                                }

                                if (constituentGroup.voteType === VoteType.WEIGHTED_BY_BALANCE) {
                                    voteResult.unit = 'fil';
                                    voteResult.unitAux = 'fil';
                                }

                                if (constituentGroup.voteType === VoteType.WEIGHTED_BY_POWER) {
                                    voteResult.unit = 'bytes';
                                }

                                this.voteResultRepository.save(voteResult);
                            }
                        };
                    } else {
                        const issueBody = await this.httpService.get(issue.download_url, {
                            auth: {
                                username: this.config.values.github.user,
                                password: this.config.values.github.token
                            }
                        }).toPromise();
                        const {
                            description,
                            author,
                            discussion
                        } = parseIssue(issueBody.data, this.config.values.issueParser);

                        poll.issueLink = discussion;
                        poll.userProfileName = author;
                        poll.description = description;
                        poll.name = issue.name.substring(0, issue.name.length - 3);

                        await this.pollsRepository.save(poll);
                    }
                } catch (e) {
                    const issue: any = issues[i];
                    console.log('get issues, error parsing issue ' + issue.number, e);
                }
            };
        }, error => {
            console.log('get issues error', error);
        }, () => {
            console.log('get issues req completed');
        });
    }

    @Cron('1 * * * * *')
    async updatePollStatus() {
        console.log('update poll status cron');

        //change status from pending to bulding_snapshot
        let polls = await getRepository(Poll)
            .createQueryBuilder()
            .where("status = :status and start <= NOW() + interval '1 hours'", {
                status: Status.PENDING
            })
            .getMany();

        for (let i = 0; i < polls.length; i++) {
            const poll = polls[i];

            this.eventEmitter.emit(
                'getSnapshot',
                poll
            );
            poll.status = Status.BUILDING_SNAPSHOT;

            await this.pollsRepository.save(poll);
        }

        //check if snapshot was created
        polls = await getRepository(Poll)
            .createQueryBuilder()
            .where("status = :status and start <= NOW()", {
                status: Status.BUILDING_SNAPSHOT,
            })
            .getMany();

        for (let i = 0; i < polls.length; i++) {
            const poll = polls[i];
            const lastProcessedMiner = await getRepository(MinerInfo)
                .createQueryBuilder()
                .where("MinerInfo.createdAt >= NOW() - (10 * interval '1 minute') and MinerInfo.pollId=:pollId and MinerInfo.height=:height", {
                    pollId: poll.id,
                    height: poll.snapshotHeight
                })
                .getOne();

            if (!lastProcessedMiner) {
                const minerCount: any = await getRepository(MinerInfo)
                    .createQueryBuilder()
                    .select("count(*) as minercount")
                    .where("MinerInfo.pollId=:pollId", {
                        pollId: poll.id,
                    })
                    .getRawOne();

                console.log(minerCount);
                if (minerCount.minercount == poll.snapshotMinerCount) {
                    poll.snapshotCreated = true;
                    await this.pollsRepository.save(poll);
                }
            }
        }

        //change status from bulding_snapshot to open
        polls = await getRepository(Poll)
            .createQueryBuilder()
            .where("status = :status and start <= NOW() and Poll.snapshotCreated = :snapshotCreated", {
                status: Status.BUILDING_SNAPSHOT,
                snapshotCreated: true
            })
            .getMany();

        for (let i = 0; i < polls.length; i++) {
            const poll = polls[i];
            poll.status = Status.OPEN;
            await this.pollsRepository.save(poll);
        }

        //change status from open to closed
        polls = await getRepository(Poll)
            .createQueryBuilder()
            .where("status = :status and Poll.end <= NOW()", {
                status: Status.OPEN,
            })
            .getMany();

        for (let i = 0; i < polls.length; i++) {
            const poll = polls[i];
            poll.status = Status.CLOSED;
            await this.pollsRepository.save(poll);
        }
    }
}