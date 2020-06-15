import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  headline: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  domainId: number;
}
