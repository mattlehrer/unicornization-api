import { IsBoolean, IsDate, IsFQDN, IsOptional } from 'class-validator';
import { FQDN } from '../domain.entity';

export class UpdateDomainDto {
  @IsOptional()
  @IsFQDN()
  name?: FQDN;

  @IsOptional()
  @IsBoolean()
  hasVerifiedDNS?: boolean;

  @IsOptional()
  @IsDate()
  lastCheckedDNS: Date;
}
