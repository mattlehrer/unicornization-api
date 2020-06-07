import { IsEnum, IsInstance } from 'class-validator';
import { Idea } from 'src/idea/idea.entity';
import { VoteType } from '../vote-types.enum';

export class CreateVoteDto {
  @IsEnum(VoteType)
  type: VoteType;

  @IsInstance(Idea)
  idea: Idea;
}
