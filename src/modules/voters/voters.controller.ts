import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PollsService } from '../polls/polls.service';
import { VoterParamsDto } from './voter.dto';
import { VotersService } from './voters.service';

@Controller()
export class VotersController {
  constructor(private votersService: VotersService) { }

  @UseGuards(JwtAuthGuard)
  @Post('api/voters')
  async postVoter(@Body() voterParams: VoterParamsDto) {
    const voter = await this.votersService.postVoter(voterParams);
    return voter;
  }

  @UseGuards(JwtAuthGuard)
  @Put('api/voters/:id')
  async putVoter(@Param('id') id: number, @Body() voterParams: VoterParamsDto) {
    await this.votersService.putVoter(id, voterParams);
    return {};
  }

  @UseGuards(JwtAuthGuard)
  @Delete('api/voters/:id')
  async deleteVoter(@Param('id') id: number) {
    await this.votersService.deleteVoter(id);
    return {};
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/voters/listConstituentGroups')
  async getConstituentGroupsList() {
    const voter = await this.votersService.getConstituentGroupsList();
    return voter;
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/voters/:id')
  async getVoter(@Param('id') id: number) {
    const voter = await this.votersService.getVoter(id);
    return voter;
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/voters/list/:constituentGroupId')
  async getVoterList(@Param('constituentGroupId') constituentGroupId: number) {
    const voters = await this.votersService.getVoterListForConstituentGroup(constituentGroupId);
    return voters;
  }
}
