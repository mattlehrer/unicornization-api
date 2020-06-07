import { EventEmitter } from 'events';
import { StrictEventEmitter } from 'nest-emitter';
import { Vote } from './vote.entity';

interface VoteEvents {
  newVote: Vote;
}

export type VoteEventEmitter = StrictEventEmitter<EventEmitter, VoteEvents>;
