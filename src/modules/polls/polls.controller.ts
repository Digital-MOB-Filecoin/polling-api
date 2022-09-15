import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GlifVoteParamsDto, VoteParamsDto } from './polls.dto';
import { PollsService } from './polls.service';
import { PollsServiceCrons } from './polls.service.crons';

@Controller()
export class PollsController {
  constructor(
    private pollsService: PollsService,
    private pollsServiceCrons: PollsServiceCrons,
  ) {}

  @Get('api/pollsFromIssues')
  async getPollsFromIssues() {
    this.pollsServiceCrons.getPollsFromIssues();
    return {};
  }

  @Get('api/textileTest')
  async textileTest() {
    this.pollsService.testTextile();
    return {};
  }

  @Get('api/snapshotTest')
  async snapshotTest() {
    this.pollsService.testSnapshot();
    return {};
  }

  @Get('api/polls/list')
  async getPollsList() {
    const voter = await this.pollsService.getPollsList();
    return voter;
  }

  @Get('api/polls/list/active')
  async getPollsListActive() {
    const polls = await this.pollsService.getPollsListActive();
    return polls;
  }

  @Get('api/polls/:id')
  async getPoll(@Param('id') id: number) {
    const poll = await this.pollsService.getPoll(id);
    return poll;
  }

  @Post('api/polls/:id/vote')
  async voteInPoll(@Param('id') id: number, @Body() voteParams: VoteParamsDto) {
    const poll = await this.pollsService.voteInPoll(id, voteParams, 'lotus');
    return poll;
  }

  @Post('api/polls/:id/vote/glif')
  async voteInPollWithGlif(@Param('id') id: number, @Body() signedMessage) {
    //needsValidation
    const poll = await this.pollsService.voteInPoll(
      id,
      { address: '', extraAddresses: [], option: '', signature: '' },
      'glif',
      signedMessage,
    );
    return poll;
  }

  @Get('api/polls/:id/view-votes')
  async viewPollVotes(@Param('id') id: string) {
    const votes = await this.pollsService.viewPollVotes(+id);
    return votes;
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/polls/:id/preview')
  async previewPoll(@Param('id') id: string) {
    const poll = await this.pollsService.previewIssue(id);
    return poll;
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/updateSignaturesToV1')
  async updateSignaturesToV1() {
    await this.pollsService.updateSignaturesToV1();
    return 'ok';
  }

  @Get('api/polls/:id/:constituentGroupId/voteList')
  async constituentGroupVotesList(
    @Param('id') id: number,
    @Param('constituentGroupId') constituentGroupId: number,
  ) {
    const poll = await this.pollsService.getConstituentGroupVoteList(
      id,
      constituentGroupId,
    );
    return poll;
  }
}
