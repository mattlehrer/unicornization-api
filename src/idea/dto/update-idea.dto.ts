import { IsOptional, IsString } from 'class-validator';

export class UpdateIdeaDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
