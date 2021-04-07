import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { getRepository, Repository } from 'typeorm';
import { MinerRelatedAddress } from './minerRelatedAddress.entity';
import { MinerInfo } from './minerInfo.entity';

@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(MinerInfo)
    private minerInfoRepository: Repository<MinerInfo>,
    @InjectRepository(MinerRelatedAddress)
    private minerRelatedAddressRepository: Repository<MinerRelatedAddress>,
  ) { }

  async storeMinerInfo(relatedAddressIds: string[], minerId: string, power: string, balance: string, lockedFunds: string, height: number, pollId: number): Promise<any> {
    const minerInfo = new MinerInfo();
    minerInfo.minerId = minerId;
    minerInfo.power = power;
    minerInfo.balance = balance;
    minerInfo.lockedBalance = lockedFunds;
    minerInfo.height = height;
    minerInfo.pollId = pollId;

    for (let i = 0; i < relatedAddressIds.length; i++) {
      const addressId = relatedAddressIds[i];
      const relatedAddress = new MinerRelatedAddress();
      relatedAddress.height = height;
      relatedAddress.addressId = addressId;
      await this.minerRelatedAddressRepository.save(relatedAddress);

      if (!minerInfo.relatedAddresses) minerInfo.relatedAddresses = [];
      minerInfo.relatedAddresses.push(relatedAddress);
    };

    await this.minerInfoRepository.save(minerInfo);
  }

  async getMinersInfo(addressId: string, height: number) {
    const relatedAddresses = await this.minerRelatedAddressRepository.find({ where: { height: height, addressId: addressId } });
    if (relatedAddresses) {
      const minerIds = [];
      relatedAddresses.forEach(relatedAddress => minerIds.push(relatedAddress.minerId));
      console.log(minerIds);

      const miners = await getRepository(MinerInfo)
        .createQueryBuilder("minerInfo")
        .where("minerInfo.height = :height", {
          height: height,
        })
        .andWhereInIds(minerIds)
        .getMany();

      return miners;
    }
    return null;
  }
}