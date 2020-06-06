import { IsDefined, IsOptional, IsString } from 'class-validator';
import { Domain } from 'src/domain/domain.entity';

export class CreateIdeaDto {
  @IsString()
  headline: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDefined()
  domain: Domain;
}
