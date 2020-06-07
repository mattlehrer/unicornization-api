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
import { UpdateVoteDto } from './dto/update-vote.dto';
import { Vote } from './vote.entity';
import { VoteEventEmitter } from './vote.events';

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
    @InjectEventEmitter() private readonly emitter: VoteEventEmitter,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(VoteService.name);
  }

  async create(details: Partial<Vote>): Promise<Vote> {
    const vote = this.voteRepository.create(details);

    await this.handleSave(vote);

    this.emitter.emit('newVote', vote);

    return vote;
  }

  async findAll(): Promise<Vote[]> {
    return this.voteRepository.find();
  }

  async findAllIncludingDeleted(): Promise<Vote[]> {
    return await this.voteRepository
      .createQueryBuilder('vote')
      .withDeleted()
      .getMany();
  }

  async findAllDeleted(): Promise<Vote[]> {
    return await this.voteRepository
      .createQueryBuilder('vote')
      .withDeleted()
      .where('deleted_at is not null')
      .getMany();
  }

  async findOneById(id: number): Promise<Vote> {
    return await this.voteRepository.findOne({ id });
  }

  async findAllVotesOfAnIdea(ideaId: number): Promise<Vote[]> {
    return await this.voteRepository
      .createQueryBuilder('vote')
      .where('vote.idea = :ideaId', { ideaId })
      .getMany();
  }

  async findAllVotesOfAUser(userId: number): Promise<Vote[]> {
    return await this.voteRepository
      .createQueryBuilder('vote')
      .where('vote.user = :userId', { userId })
      .getMany();
  }

  async updateOne({
    user,
    id,
    fieldsToUpdate,
  }: {
    user: User;
    id: number;
    fieldsToUpdate: UpdateVoteDto;
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
    const vote = await this.findOneById(id);

    this.continueIfAuthorized(vote, user);

    const result = await this.voteRepository.softDelete(vote.id);
    return this.handleDbUpdateResult(result);
  }

  private continueIfAuthorized(vote: Vote, user: User) {
    if (vote.user !== user && !user.isAdmin()) {
      throw new UnauthorizedException();
    }
  }

  private async handleSave(vote: Vote) {
    try {
      await vote.save();
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
