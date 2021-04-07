import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConstituentGroup, GroupType } from './constituentGroup.entity';
import { VoterParamsDto } from './voter.dto';
import { Voter } from './voter.entity';

@Injectable()
export class VotersService {
  constructor(
    @InjectRepository(Voter)
    private voterRepository: Repository<Voter>,
    @InjectRepository(ConstituentGroup)
    private constituentGroupRepository: Repository<ConstituentGroup>) {
  }

  async postVoter(params: VoterParamsDto) {
    const constituentGroup = await this.constituentGroupRepository.findOne({ id: params.constituentGroupId });
    if (!constituentGroup || constituentGroup.groupType !== GroupType.LIST) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid group id',
      }, HttpStatus.BAD_REQUEST);
    }
    const voter = new Voter();
    voter.address = params.address;
    voter.constituentGroupId = params.constituentGroupId;
    await this.voterRepository.save(voter);
    return voter;
  }

  async putVoter(id: number, params: VoterParamsDto) {
    const voter = await this.voterRepository.findOne({ id: id })
    if (!voter) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid id',
      }, HttpStatus.BAD_REQUEST);
    }

    const constituentGroup = await this.constituentGroupRepository.findOne({ id: params.constituentGroupId });
    if (!constituentGroup || constituentGroup.groupType !== GroupType.LIST) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid group id',
      }, HttpStatus.BAD_REQUEST);
    }

    voter.address = params.address;
    voter.constituentGroupId = params.constituentGroupId;
    await this.voterRepository.save(voter);
  }

  async deleteVoter(id: number) {
    const voter = await this.voterRepository.findOne({ id: id })
    if (!voter) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid id',
      }, HttpStatus.BAD_REQUEST);
    }
    await this.voterRepository.delete(voter);
  }

  async getVoter(id: number) {
    const voter = await this.voterRepository.findOne({ id: id })
    if (!voter) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid id',
      }, HttpStatus.BAD_REQUEST);
    }
    return voter;
  }

  async getVoterListForConstituentGroup(constituentGroupId: number) {
    const constituentGroup = await this.constituentGroupRepository.findOne({ id: constituentGroupId });
    if (!constituentGroup || constituentGroup.groupType !== GroupType.LIST) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid group id',
      }, HttpStatus.BAD_REQUEST);
    }

    const voters = await this.voterRepository.find({ constituentGroupId: constituentGroupId })
    return voters;
  }

  async getConstituentGroupsList() {
    const constituentGroups = await this.constituentGroupRepository.find({ groupType: GroupType.LIST });

    return constituentGroups;
  }
}
