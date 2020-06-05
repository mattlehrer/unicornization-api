import { IsFQDN } from 'class-validator';
import { FQDN } from '../domain.entity';

export class CreateDomainDto {
  @IsFQDN()
  name: FQDN;
}
