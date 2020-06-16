import { IsEnum, IsInt } from 'class-validator';
import { VoteType } from '../vote-types.enum';

export class CreateVoteDto {
  @IsEnum(VoteType)
  type: VoteType;

  @IsInt()
  ideaId: number;
}
