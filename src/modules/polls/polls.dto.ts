import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SignedMessage } from 'filecoin.js/builds/dist/providers/Types';

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

export class GlifVoteParamsDto {
  @ValidateNested()
  message: SignedMessage;
}
