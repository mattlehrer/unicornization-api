import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from 'nest-emitter';
import { Domain } from 'src/domain/domain.entity';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { Repository, UpdateResult } from 'typeorm';
import { Idea } from './idea.entity';
import { IdeaEventEmitter } from './idea.events';

@Injectable()
export class IdeaService {
  constructor(
    @InjectRepository(Idea)
    private readonly ideaRepository: Repository<Idea>,
    @InjectEventEmitter() private readonly emitter: IdeaEventEmitter,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(IdeaService.name);
  }

  async create({
    user,
    domain,
    details,
  }: {
    domain: Domain;
    user: User;
    details: Partial<Idea>;
  }): Promise<Idea> {
    const idea = this.ideaRepository.create({ domain, user, ...details });

    await this.handleSave(idea);

    this.emitter.emit('newIdea', idea);

    return idea;
  }

  async findAll(): Promise<Idea[]> {
    return this.ideaRepository.find();
  }

  private async handleSave(idea: Idea) {
    try {
      await idea.save();
    } catch (error) {
      this.logger.error({ error });
      throw new InternalServerErrorException();
    }
  }

  private handleDbUpdateResult(result: UpdateResult) {
    if (result.affected) {
      return;
    }
    this.logger.error(result);
    throw new InternalServerErrorException();
  }
}
