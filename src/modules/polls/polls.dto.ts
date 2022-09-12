import { IsArray, IsOptional, IsString } from 'class-validator';

export class VoteParamsDto {
  @IsString()
  address: string;

  @IsString()
  option: string;

  @IsString()
  signature: string;

  @IsArray()
  @IsOptional()
  extraAddresses: [];
}
