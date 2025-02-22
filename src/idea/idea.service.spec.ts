import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter } from 'events';
import { EVENT_EMITTER_TOKEN } from 'nest-emitter';
import { DomainService } from 'src/domain/domain.service';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { VoteService } from 'src/vote/vote.service';
import { Repository } from 'typeorm';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { Idea } from './idea.entity';
import { IdeaService } from './idea.service';

jest.mock('src/logger/logger.service');
jest.mock('src/domain/domain.service');
jest.mock('src/vote/vote.service');

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
const mockIdea = {
  id: 101,
  headline: 'Mock idea',
  user: mockUser,
  domain: mockDomain,
  votes: [],
  save: jest.fn(),
};
const mockDeletedIdea = {
  ...mockIdea,
  deleted_at: new Date(),
};
const mockIdeaRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  save: jest.fn().mockReturnValue(mockIdea),
  create: jest.fn().mockReturnValue(mockIdea),
  softDelete: jest.fn(),
  query: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  }),
});

describe('IdeaService', () => {
  let ideaService: IdeaService;
  let ideaRepository;
  let emitter;
  let domainService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdeaService,
        {
          provide: getRepositoryToken(Idea),
          useFactory: mockIdeaRepository,
        },
        { provide: EVENT_EMITTER_TOKEN, useValue: EventEmitter },
        LoggerService,
        DomainService,
        VoteService,
      ],
    }).compile();

    ideaService = module.get<IdeaService>(IdeaService);
    ideaRepository = module.get<Repository<Idea>>(getRepositoryToken(Idea));
    emitter = module.get<EventEmitter>(EVENT_EMITTER_TOKEN);
    domainService = module.get<DomainService>(DomainService);
  });

  it('should be defined', () => {
    expect(ideaService).toBeDefined();
  });

  describe('create', () => {
    it('should return idea and emit newIdea event', async () => {
      emitter.emit = jest.fn();
      domainService.findOneById.mockResolvedValueOnce(mockDomain);
      const mockCreateDto: CreateIdeaDto = {
        headline: mockIdea.headline,
        domainId: mockDomain.id,
      };

      const result = await ideaService.create({
        user: mockUser as User,
        ...mockCreateDto,
      });

      expect(result).toEqual(mockIdea);
      expect(domainService.findOneById).toHaveBeenCalledWith(mockDomain.id);
      expect(domainService.findOneById).toHaveBeenCalledTimes(1);
      expect(mockIdea.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockIdea.save).toHaveBeenCalledTimes(1);

      expect(emitter.emit).toHaveBeenCalledWith('newIdea', mockIdea);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on db error', async () => {
      mockIdea.save.mockRejectedValueOnce(new Error('Test'));
      domainService.findOneById.mockResolvedValueOnce(mockDomain);
      emitter.emit = jest.fn();

      const error = await ideaService
        .create({
          user: mockUser as User,
          domainId: mockDomain.id,
          headline: mockIdea.headline,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(domainService.findOneById).toHaveBeenCalledWith(mockDomain.id);
      expect(domainService.findOneById).toHaveBeenCalledTimes(1);
      expect(mockIdea.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockIdea.save).toHaveBeenCalledTimes(1);
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all ideas', async () => {
      const mockIdea2: any = {};
      Object.assign(mockIdea2, mockIdea);
      mockIdea2.id = 22;
      ideaRepository.find.mockResolvedValueOnce([mockIdea, mockIdea2]);

      const result = await ideaService.findAll();

      expect(result).toStrictEqual([mockIdea, mockIdea2]);
      expect(ideaRepository.find).toHaveBeenCalledWith(/* nothing */);
      expect(ideaRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllIncludingDeleted', () => {
    it('should find all domains, including soft deleted', async () => {
      const mockIdea2: any = {};
      Object.assign(mockIdea2, mockIdea);
      mockIdea2.id = 12;
      ideaRepository
        .createQueryBuilder()
        .withDeleted()
        .getMany.mockResolvedValueOnce([mockIdea, mockIdea2, mockDeletedIdea]);

      const result = await ideaService.findAllIncludingDeleted();

      expect(result).toStrictEqual([mockIdea, mockIdea2, mockDeletedIdea]);
      expect(
        ideaRepository.createQueryBuilder().withDeleted,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        ideaRepository.createQueryBuilder().withDeleted().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        ideaRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllDeleted', () => {
    it('should find all users, including soft deleted', async () => {
      ideaRepository
        .createQueryBuilder()
        .withDeleted()
        .where()
        .getMany.mockResolvedValueOnce([mockDeletedIdea]);

      const result = await ideaService.findAllDeleted();

      expect(result).toStrictEqual([mockDeletedIdea]);
      expect(
        ideaRepository.createQueryBuilder().withDeleted,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        ideaRepository.createQueryBuilder().withDeleted().where,
      ).toHaveBeenCalledWith('deleted_at is not null');
      expect(
        ideaRepository.createQueryBuilder().withDeleted().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        ideaRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOneById', () => {
    it('should return idea', async () => {
      ideaRepository.findOne.mockResolvedValueOnce(mockIdea);

      const result = await ideaService.findOneById(mockIdea.id);

      expect(ideaRepository.findOne).toHaveBeenCalledWith({
        id: mockIdea.id,
      });
      expect(ideaRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockIdea);
    });
  });

  describe('findAllIdeasForADomain', () => {
    it('should find all ideas for a domain', async () => {
      const mockIdea2: any = {};
      Object.assign(mockIdea2, mockIdea);
      mockIdea2.id = 22;
      ideaRepository.query.mockResolvedValueOnce([mockIdea, mockIdea2]);

      const result = await ideaService.findAllIdeasForADomain(mockDomain.id);

      expect(result).toStrictEqual([mockIdea, mockIdea2]);
      expect(ideaRepository.query.mock.calls[0][0]).toMatchInlineSnapshot(`
        "SELECT idea.*, SUM(vote.type) as score 
                  FROM idea
                  LEFT JOIN vote ON idea.id = vote.\\"ideaId\\"
                  WHERE idea.\\"domainId\\" = $1
                  GROUP BY idea.id
                  ORDER BY score DESC
                  LIMIT $2
                  OFFSET $3;"
      `);
      expect(ideaRepository.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllIdeasOfAUser', () => {
    it('should find all ideas of a user', async () => {
      const mockIdea2: any = {};
      Object.assign(mockIdea2, mockIdea);
      mockIdea2.id = 22;
      ideaRepository
        .createQueryBuilder()
        .where()
        .getMany.mockResolvedValueOnce([mockIdea, mockIdea2]);

      const result = await ideaService.findAllIdeasOfAUser(mockUser.id);

      expect(result).toStrictEqual([mockIdea, mockIdea2]);
      expect(ideaRepository.createQueryBuilder).toHaveBeenCalledWith('idea');
      expect(
        ideaRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('idea.user = :userId', { userId: mockUser.id });
      expect(
        ideaRepository.createQueryBuilder().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        ideaRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateOne', () => {
    it('should update idea fields', async () => {
      const updateDto: any = {
        headline: 'great idea',
      };
      const updatedIdea = {
        ...mockIdea,
        ...updateDto,
      };
      ideaRepository.findOne.mockResolvedValueOnce(mockIdea);
      mockIdea.save.mockResolvedValueOnce(updatedIdea);

      const result = await ideaService.updateOne({
        user: mockUser as User,
        id: mockIdea.id,
        fieldsToUpdate: updateDto,
      });

      expect(ideaRepository.findOne).toHaveBeenCalledWith({
        id: mockIdea.id,
      });
      expect(ideaRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockIdea.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockIdea.save).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('when db throws unknown error, should throw InternalServerErrorException', async () => {
      const updateDto: UpdateIdeaDto = {
        headline: 'good idea',
      };
      ideaRepository.findOne.mockResolvedValueOnce(mockIdea);
      mockIdea.save.mockRejectedValueOnce(new Error('db error'));

      const error = await ideaService
        .updateOne({
          user: mockUser as User,
          id: mockIdea.id,
          fieldsToUpdate: updateDto,
        })
        .catch((e) => e);

      expect(ideaRepository.findOne).toHaveBeenCalledWith({
        id: mockIdea.id,
      });
      expect(ideaRepository.findOne).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(error).toMatchInlineSnapshot(`[Error: Internal Server Error]`);
      expect(mockIdea.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockIdea.save).toHaveBeenCalledTimes(1);
    });

    it('when user does not own idea, should throw UnauthorizedException', async () => {
      const updateDto: any = {
        headline: 'this is the best mock idea',
      };
      const mockUnownedIdea = {
        ...mockIdea,
        user: {
          ...mockUser,
          id: mockUser.id + 1,
        },
      };
      ideaRepository.findOne.mockResolvedValueOnce(mockUnownedIdea);
      // mockIdea.save.mockRejectedValueOnce(new Error('db error'));

      const error = await ideaService
        .updateOne({
          user: mockUser as User,
          id: mockUnownedIdea.id,
          fieldsToUpdate: updateDto,
        })
        .catch((e) => e);

      expect(ideaRepository.findOne).toHaveBeenCalledWith({
        id: mockUnownedIdea.id,
      });
      expect(ideaRepository.findOne).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error).toMatchInlineSnapshot(`[Error: Unauthorized]`);
    });

    it('when updateDto has no updates, return idea unchanged', async () => {
      const updateDto: any = {
        headline: undefined,
      };
      ideaRepository.findOne.mockResolvedValueOnce(mockIdea);

      const result = await ideaService.updateOne({
        user: mockUser as User,
        id: mockIdea.id,
        fieldsToUpdate: updateDto,
      });

      expect(ideaRepository.findOne).toHaveBeenCalledWith({
        id: mockIdea.id,
      });
      expect(ideaRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(mockIdea.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should softDelete a vote', async () => {
      ideaRepository.findOne.mockResolvedValueOnce(mockIdea);
      ideaRepository.softDelete.mockResolvedValueOnce({ affected: 1 });

      const result = await ideaService.deleteOne({
        id: mockIdea.id,
        user: mockUser as User,
      });

      expect(ideaRepository.softDelete).toHaveBeenCalledWith(mockIdea.id);
      expect(ideaRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it("when db doesn't soft delete, should throw InternalServerErrorException", async () => {
      ideaRepository.findOne.mockResolvedValueOnce(mockIdea);
      ideaRepository.softDelete.mockResolvedValueOnce({ affected: 0 });

      const error = await ideaService
        .deleteOne({ id: mockIdea.id, user: mockUser as User })
        .catch((e) => e);

      expect(ideaRepository.softDelete).toHaveBeenCalledWith(mockIdea.id);
      expect(ideaRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(InternalServerErrorException);
    });
  });
});
