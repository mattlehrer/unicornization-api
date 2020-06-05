import { EventEmitter } from 'events';
import { StrictEventEmitter } from 'nest-emitter';
import { Domain } from './domain.entity';

interface DomainEvents {
  newDomain: Domain;
}

export type DomainEventEmitter = StrictEventEmitter<EventEmitter, DomainEvents>;
