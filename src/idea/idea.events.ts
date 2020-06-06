import { EventEmitter } from 'events';
import { StrictEventEmitter } from 'nest-emitter';
import { Idea } from './idea.entity';

interface IdeaEvents {
  newIdea: Idea;
}

export type IdeaEventEmitter = StrictEventEmitter<EventEmitter, IdeaEvents>;
