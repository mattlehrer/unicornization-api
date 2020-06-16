import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter } from 'events';
import { EVENT_EMITTER_TOKEN } from 'nest-emitter';
import { IdeaService } from 'src/idea/idea.service';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { Repository } from 'typeorm';
import { CreateVoteDto } from './dto/create-vote.dto';
import { UpdateVoteDto } from './dto/update-vote.dto';
import { VoteType } from './vote-types.enum';
import { Vote } from './vote.entity';
import { VoteService } from './vote.service';

jest.mock('src/logger/logger.service');
jest.mock('src/idea/idea.service');

const mockUser = {
  id: 1,
  isAdmin: () => false,
};
const mockDomain: any = {
  id: 10,
  name: 'mock.com',
  save: jest.fn(),
  user: mockUser,
};
const mockIdea: any = {
  id: 101,
  headline: 'Mock idea',
  description: 'Mock description',
  user: mockUser,
  domain: mockDomain,
  save: jest.fn(),
};
const mockVote = {
  id: 1001,
  type: VoteType.UP,
  idea: mockIdea,
  user: mockUser,
  save: jest.fn(),
};
const mockDeletedVote = {
  ...mockVote,
  id: 3003,
  deleted_at: new Date(),
};
const mockVoteRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  save: jest.fn().mockReturnValue(mockVote),
  create: jest.fn().mockReturnValue(mockVote),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  }),
});

describe('VoteService', () => {
  let voteService: VoteService;
  let voteRepository;
  let emitter;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        {
          provide: getRepositoryToken(Vote),
          useFactory: mockVoteRepository,
        },
        { provide: EVENT_EMITTER_TOKEN, useValue: EventEmitter },
        LoggerService,
        IdeaService,
      ],
    }).compile();

    voteService = module.get<VoteService>(VoteService);
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
    emitter = module.get<EventEmitter>(EVENT_EMITTER_TOKEN);
  });

  it('should be defined', () => {
    expect(voteService).toBeDefined();
  });

  describe('create', () => {
    it('should return vote and emit newVote event', async () => {
      emitter.emit = jest.fn();
      const mockCreateDto: CreateVoteDto = {
        type: mockVote.type,
        ideaId: mockVote.idea.id,
      };

      const result = await voteService.create({
        user: mockUser as User,
        ...mockCreateDto,
      });

      expect(result).toEqual(mockVote);
      expect(mockVote.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockVote.save).toHaveBeenCalledTimes(1);

      expect(emitter.emit).toHaveBeenCalledWith('newVote', mockVote);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on db error', async () => {
      mockVote.save.mockRejectedValueOnce(new Error('Test'));
      emitter.emit = jest.fn();

      const error = await voteService
        .create({
          user: mockUser as User,
          type: mockVote.type,
          ideaId: mockVote.idea.id,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(mockVote.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockVote.save).toHaveBeenCalledTimes(1);
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all votes', async () => {
      const mockVote2: any = {};
      Object.assign(mockVote2, mockVote);
      mockVote2.id = 202;
      voteRepository.find.mockResolvedValueOnce([mockVote, mockVote2]);

      const result = await voteService.findAll();

      expect(result).toStrictEqual([mockVote, mockVote2]);
      expect(voteRepository.find).toHaveBeenCalledWith(/* nothing */);
      expect(voteRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllIncludingDeleted', () => {
    it('should find all domains, including soft deleted', async () => {
      const mockVote2: any = {};
      Object.assign(mockVote2, mockVote);
      mockVote2.id = 202;

      voteRepository
        .createQueryBuilder()
        .withDeleted()
        .getMany.mockResolvedValueOnce([mockVote, mockVote2, mockDeletedVote]);

      const result = await voteService.findAllIncludingDeleted();

      expect(result).toStrictEqual([mockVote, mockVote2, mockDeletedVote]);
      expect(
        voteRepository.createQueryBuilder().withDeleted,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        voteRepository.createQueryBuilder().withDeleted().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        voteRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllDeleted', () => {
    it('should find all users, including soft deleted', async () => {
      voteRepository
        .createQueryBuilder()
        .withDeleted()
        .where()
        .getMany.mockResolvedValueOnce([mockDeletedVote]);

      const result = await voteService.findAllDeleted();

      expect(result).toStrictEqual([mockDeletedVote]);
      expect(
        voteRepository.createQueryBuilder().withDeleted,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        voteRepository.createQueryBuilder().withDeleted().where,
      ).toHaveBeenCalledWith('deleted_at is not null');
      expect(
        voteRepository.createQueryBuilder().withDeleted().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        voteRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOneById', () => {
    it('should return vote', async () => {
      voteRepository.findOne.mockResolvedValueOnce(mockVote);

      const result = await voteService.findOneById(mockVote.id);

      expect(voteRepository.findOne).toHaveBeenCalledWith({
        id: mockVote.id,
      });
      expect(voteRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockVote);
    });
  });

  describe('findAllVotesOfAnIdea', () => {
    it('should find all votes of an idea', async () => {
      const mockVote2: any = {};
      Object.assign(mockVote2, mockVote);
      mockVote2.id = 22;
      voteRepository
        .createQueryBuilder()
        .where()
        .getMany.mockResolvedValueOnce([mockVote, mockVote2]);

      const result = await voteService.findAllVotesOfAnIdea(mockIdea.id);

      expect(result).toStrictEqual([mockVote, mockVote2]);
      expect(voteRepository.createQueryBuilder).toHaveBeenCalledWith('vote');
      expect(
        voteRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('vote.idea = :ideaId', { ideaId: mockIdea.id });
      expect(
        voteRepository.createQueryBuilder().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        voteRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllVotesOfAUser', () => {
    it('should find all votes of a user', async () => {
      const mockVote2: any = {};
      Object.assign(mockVote2, mockVote);
      mockVote2.id = 22;
      voteRepository
        .createQueryBuilder()
        .where()
        .getMany.mockResolvedValueOnce([mockVote, mockVote2]);

      const result = await voteService.findAllVotesOfAUser(mockUser.id);

      expect(result).toStrictEqual([mockVote, mockVote2]);
      expect(voteRepository.createQueryBuilder).toHaveBeenCalledWith('vote');
      expect(
        voteRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('vote.user = :userId', { userId: mockUser.id });
      expect(
        voteRepository.createQueryBuilder().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        voteRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateOne', () => {
    it('should update vote fields', async () => {
      const updateDto: any = {
        type: VoteType.DOWN,
      };
      const updatedVote = {
        ...mockVote,
        ...updateDto,
      };
      voteRepository.findOne.mockResolvedValueOnce(mockVote);
      mockIdea.save.mockResolvedValueOnce(updatedVote);

      const result = await voteService.updateOne({
        user: mockUser as User,
        id: mockVote.id,
        fieldsToUpdate: updateDto,
      });

      expect(voteRepository.findOne).toHaveBeenCalledWith({
        id: mockVote.id,
      });
      expect(voteRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockVote.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockVote.save).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('when db throws unknown error, should throw InternalServerErrorException', async () => {
      const updateDto: UpdateVoteDto = {
        type: VoteType.DOWN,
        ideaId: mockVote.idea.id,
      };
      voteRepository.findOne.mockResolvedValueOnce(mockVote);
      mockVote.save.mockRejectedValueOnce(new Error('db error'));

      const error = await voteService
        .updateOne({
          user: mockUser as User,
          id: mockVote.id,
          fieldsToUpdate: updateDto,
        })
        .catch((e) => e);

      expect(voteRepository.findOne).toHaveBeenCalledWith({
        id: mockVote.id,
      });
      expect(voteRepository.findOne).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(error).toMatchInlineSnapshot(`[Error: Internal Server Error]`);
      expect(mockVote.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockVote.save).toHaveBeenCalledTimes(1);
    });

    it('when user does not own vote, should throw UnauthorizedException', async () => {
      const updateDto: any = {
        type: VoteType.DOWN,
        ideaId: mockVote.idea.id,
      };
      const mockUnownedVote = {
        ...mockVote,
        user: {
          ...mockUser,
          id: mockUser.id + 1,
        },
      };
      voteRepository.findOne.mockResolvedValueOnce(mockUnownedVote);

      const error = await voteService
        .updateOne({
          user: mockUser as User,
          id: mockUnownedVote.id,
          fieldsToUpdate: updateDto,
        })
        .catch((e) => e);

      expect(voteRepository.findOne).toHaveBeenCalledWith({
        id: mockUnownedVote.id,
      });
      expect(voteRepository.findOne).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error).toMatchInlineSnapshot(`[Error: Unauthorized]`);
    });

    it('when updateDto has no updates, return vote unchanged', async () => {
      const updateDto: any = {
        type: undefined,
        idea: undefined,
      };
      voteRepository.findOne.mockResolvedValueOnce(mockVote);

      const result = await voteService.updateOne({
        user: mockUser as User,
        id: mockVote.id,
        fieldsToUpdate: updateDto,
      });

      expect(voteRepository.findOne).toHaveBeenCalledWith({
        id: mockVote.id,
      });
      expect(voteRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(mockVote.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should softDelete a vote', async () => {
      voteRepository.findOne.mockResolvedValueOnce(mockVote);
      voteRepository.softDelete.mockResolvedValueOnce({ affected: 1 });

      const result = await voteService.deleteOne({
        id: mockVote.id,
        user: mockUser as User,
      });

      expect(voteRepository.softDelete).toHaveBeenCalledWith(mockVote.id);
      expect(voteRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it("when db doesn't soft delete, should throw InternalServerErrorException", async () => {
      voteRepository.findOne.mockResolvedValueOnce(mockVote);
      voteRepository.softDelete.mockResolvedValueOnce({ affected: 0 });

      const error = await voteService
        .deleteOne({ id: mockVote.id, user: mockUser as User })
        .catch((e) => e);

      expect(voteRepository.softDelete).toHaveBeenCalledWith(mockVote.id);
      expect(voteRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(InternalServerErrorException);
    });
  });
});
