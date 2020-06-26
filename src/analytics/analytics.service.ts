import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { classToPlain } from 'class-transformer';
import { InjectEventEmitter } from 'nest-emitter';
import { Domain } from 'src/domain/domain.entity';
import { DomainEventEmitter } from 'src/domain/domain.events';
import { Idea } from 'src/idea/idea.entity';
import { IdeaEventEmitter } from 'src/idea/idea.events';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { UserEventEmitter } from 'src/user/user.events';
import { Vote } from 'src/vote/vote.entity';
import { VoteEventEmitter } from 'src/vote/vote.events';
import Analytics = require('analytics-node');

@Injectable()
export class AnalyticsService implements OnModuleInit {
  analytics: Analytics;
  constructor(
    @InjectEventEmitter() private readonly userEmitter: UserEventEmitter,
    @InjectEventEmitter() private readonly domainEmitter: DomainEventEmitter,
    @InjectEventEmitter() private readonly ideaEmitter: IdeaEventEmitter,
    @InjectEventEmitter() private readonly voteEmitter: VoteEventEmitter,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(AnalyticsService.name);
    const segmentKey = configService.get('segment.writeKey');
    this.analytics = new Analytics(segmentKey);
  }
  onModuleInit(): void {
    this.userEmitter.on(
      'newUser',
      async (user: User) => await this.onNewUser(user),
    );
    this.domainEmitter.on(
      'newDomain',
      async (domain: Domain) => await this.onNewDomain(domain),
    );
    this.ideaEmitter.on(
      'newIdea',
      async (idea: Idea) => await this.onNewIdea(idea),
    );
    this.voteEmitter.on(
      'newVote',
      async (vote: Vote) => await this.onNewVote(vote),
    );
  }

  async onNewUser(userObj: User): Promise<void> {
    const user = classToPlain(userObj) as User;
    this.logger.debug(
      `Ready to send ${JSON.stringify(user, null, 2)} to analytics service`,
    );
    this.analytics.identify({
      userId: user.id,
      traits: user,
    });
    this.analytics.track({
      userId: user.id,
      event: 'Signed Up',
    });
  }

  async onNewDomain(domainObj: Domain): Promise<void> {
    const domain = classToPlain(domainObj) as Domain;
    this.logger.debug(
      `Ready to send ${JSON.stringify(domain, null, 2)} to analytics service`,
    );
    this.analytics.track({
      userId: domainObj.user.id,
      event: 'Added Domain',
      properties: domain,
    });
  }

  async onNewIdea(ideaObj: Idea): Promise<void> {
    const idea = classToPlain(ideaObj) as Idea;
    this.logger.debug(
      `Ready to send ${JSON.stringify(idea, null, 2)} to analytics service`,
    );
    this.analytics.track({
      userId: ideaObj.user.id,
      event: 'Added Idea',
      properties: idea,
    });
  }

  async onNewVote(voteObj: Vote): Promise<void> {
    const vote = classToPlain(voteObj) as Vote;
    this.logger.debug(
      `Ready to send ${JSON.stringify(vote, null, 2)} to analytics service`,
    );
    this.analytics.track({
      userId: voteObj.user.id,
      event: 'Added Vote',
      properties: vote,
    });
  }
}
