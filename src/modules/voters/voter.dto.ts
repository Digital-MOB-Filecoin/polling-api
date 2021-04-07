import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoterDto {
  @IsNumber()
  @ApiProperty({
    example: 1,
    description: 'constituent group id',
  })
  constituentGroupId: number;

  @IsString()
  @ApiProperty({
    example: 'f1...',
    description: 'address',
  })
  address: string;
}

export class VoterParamsDto {
  @IsNumber()
  constituentGroupId: number;

  @IsString()
  address: string;
}
