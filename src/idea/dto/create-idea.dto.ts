import { IsInstance, IsOptional, IsString } from 'class-validator';
import { Domain } from 'src/domain/domain.entity';

export class CreateIdeaDto {
  @IsString()
  headline: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInstance(Domain)
  domain: Domain;
}
