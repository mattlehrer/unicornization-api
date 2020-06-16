import { IsEnum, IsInt } from 'class-validator';
import { VoteType } from '../vote-types.enum';

export class UpdateVoteDto {
  @IsEnum(VoteType)
  type: VoteType;

  @IsInt()
  ideaId: number;
}
