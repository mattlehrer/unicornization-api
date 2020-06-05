import { FQDN } from './domain.entity';

export function fromFQDN(value: FQDN): FQDN {
  return value;
}

export function toFQDN(value: FQDN): FQDN {
  return value.toLowerCase();
}
