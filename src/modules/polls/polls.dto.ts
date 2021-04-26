import { IsArray, IsString } from 'class-validator';

export class VoteParamsDto {
    @IsString()
    address: string;

    @IsString()
    option: string;

    @IsString()
    signature: string;

    @IsArray()
    extraAddresses: [];
}
