import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from 'nest-emitter';
import { DomainService } from 'src/domain/domain.service';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { VoteType } from 'src/vote/vote-types.enum';
import { VoteService } from 'src/vote/vote.service';
import { Repository, UpdateResult } from 'typeorm';
import { CreateIdeaDto } from './dto/create-idea.dto';
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
    private readonly domainService: DomainService,
    @Inject(forwardRef(() => VoteService))
    private readonly voteService: VoteService,
  ) {
    this.logger.setContext(IdeaService.name);
  }

  async create(details: CreateIdeaDto & Partial<Idea>): Promise<Idea> {
    const domain = await this.domainService.findOneById(details.domainId);
    delete details.domainId;
    const idea = this.ideaRepository.create({
      ...details,
      domain,
    });

    await this.handleSave(idea);

    await this.voteService.create({
      type: VoteType.UP,
      ideaId: idea.id,
      user: idea.user,
    });

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

  async findAllIdeasForADomain(
    domainId: number,
    limit = 10,
    offset = 0,
  ): Promise<Idea[]> {
    let ideas: Idea[];
    try {
      ideas = await this.ideaRepository.query(
        `SELECT idea.*, SUM(vote.type) as score 
          FROM idea
          LEFT JOIN vote ON idea.id = vote."ideaId"
          WHERE idea."domainId" = $1
          GROUP BY idea.id
          ORDER BY score DESC
          LIMIT $2
          OFFSET $3;`,
        [domainId, limit, offset],
      );
    } catch (err) {
      this.logger.error({ err });
      throw new InternalServerErrorException();
    }
    return ideas;
  }

  async findAllIdeasOfAUser(userId: number): Promise<Idea[]> {
    return await this.ideaRepository
      .createQueryBuilder('idea')
      .where('idea.user = :userId', { userId })
      .getMany();
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
    const vote = await this.findOneById(id);

    this.continueIfAuthorized(vote, user);

    // Remove undefined keys for update
    for (const key in fieldsToUpdate) {
      if (typeof fieldsToUpdate[key] === 'undefined') {
        delete fieldsToUpdate[key];
      } else {
        vote[key] = fieldsToUpdate[key];
      }
    }

    if (Object.entries(fieldsToUpdate).length > 0) {
      await this.handleSave(vote);
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
