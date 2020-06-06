import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from 'nest-emitter';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { Repository, UpdateResult } from 'typeorm';
import { UpdateIdeaDto } from './dto/update-idea.dto';
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

  async create(details: Partial<Idea>): Promise<Idea> {
    const idea = this.ideaRepository.create(details);

    await this.handleSave(idea);

    this.emitter.emit('newIdea', idea);

    return idea;
  }

  async findAll(): Promise<Idea[]> {
    return this.ideaRepository.find();
  }

  async findAllIncludingDeleted(): Promise<Idea[]> {
    return await this.ideaRepository
      .createQueryBuilder('idea')
      .withDeleted()
      .getMany();
  }

  async findAllDeleted(): Promise<Idea[]> {
    return await this.ideaRepository
      .createQueryBuilder('idea')
      .withDeleted()
      .where('deleted_at is not null')
      .getMany();
  }

  async findOneById(id: number): Promise<Idea> {
    return await this.ideaRepository.findOne({ id });
  }

  async updateOne({
    user,
    id,
    fieldsToUpdate,
  }: {
    user: User;
    id: number;
    fieldsToUpdate: UpdateIdeaDto;
  }): Promise<void> {
    const domain = await this.findOneById(id);

    this.continueIfAuthorized(domain, user);

    // Remove undefined keys for update
    for (const key in fieldsToUpdate) {
      if (typeof fieldsToUpdate[key] === 'undefined') {
        delete fieldsToUpdate[key];
      } else {
        domain[key] = fieldsToUpdate[key];
      }
    }

    if (Object.entries(fieldsToUpdate).length > 0) {
      await this.handleSave(domain);
    }

    return;
  }

  async deleteOne({ id, user }: { id: number; user: User }): Promise<void> {
    const idea = await this.findOneById(id);

    this.continueIfAuthorized(idea, user);

    const result = await this.ideaRepository.softDelete(idea.id);
    return this.handleDbUpdateResult(result);
  }

  private continueIfAuthorized(idea: Idea, user: User) {
    if (idea.user !== user && !user.isAdmin()) {
      throw new UnauthorizedException();
    }
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
