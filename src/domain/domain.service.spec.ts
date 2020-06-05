import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter } from 'events';
import { EVENT_EMITTER_TOKEN } from 'nest-emitter';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/user/user.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { Domain } from './domain.entity';
import { DomainService } from './domain.service';

jest.mock('src/logger/logger.service');

const mockUser = {
  id: 1,
  isAdmin: () => false,
};
const mockDomain: any = {
  id: 1,
  name: 'mock.com',
  save: jest.fn(),
  user: mockUser,
};
const mockDeletedDomain = {
  ...mockDomain,
  deleted_at: new Date(),
};

const mockDomainRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  save: jest.fn().mockReturnValue(mockDomain),
  create: jest.fn().mockReturnValue(mockDomain),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  }),
});

describe('DomainService', () => {
  let domainService: DomainService;
  let domainRepository;
  let emitter;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainService,
        {
          provide: getRepositoryToken(Domain),
          useFactory: mockDomainRepository,
        },
        { provide: EVENT_EMITTER_TOKEN, useValue: EventEmitter },
        LoggerService,
      ],
    }).compile();

    domainService = module.get<DomainService>(DomainService);
    domainRepository = module.get<Repository<Domain>>(
      getRepositoryToken(Domain),
    );
    emitter = module.get<EventEmitter>(EVENT_EMITTER_TOKEN);
  });

  it('should be defined', () => {
    expect(domainService).toBeDefined();
  });

  describe('create', () => {
    it('should return domain and emit newDomain event', async () => {
      emitter.emit = jest.fn();

      const result = await domainService.create({
        user: mockUser as User,
        name: mockDomain.name,
      });

      expect(result).toEqual(mockDomain);
      expect(mockDomain.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockDomain.save).toHaveBeenCalledTimes(1);

      expect(emitter.emit).toHaveBeenCalledWith('newDomain', mockDomain);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException on dup username/email', async () => {
      emitter.emit = jest.fn();
      const query = 'blah';
      const parameters = [];
      const driverError = {
        code: '23505',
        detail: `Key ("name")=(${mockDomain.name}) already exists`,
      };
      const queryError = new QueryFailedError(query, parameters, driverError);
      mockDomain.save.mockRejectedValueOnce(queryError);

      const error = await domainService
        .create({
          user: mockUser as User,
          name: mockDomain.name,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(mockDomain.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockDomain.save).toHaveBeenCalledTimes(1);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on db error', async () => {
      mockDomain.save.mockRejectedValueOnce(new Error('Test'));
      emitter.emit = jest.fn();

      const result = await domainService
        .create({
          user: mockUser as User,
          name: mockDomain.name,
        })
        .catch((e) => e);

      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(mockDomain.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockDomain.save).toHaveBeenCalledTimes(1);
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all domains', async () => {
      const mockDomain2: any = {};
      Object.assign(mockDomain2, mockDomain);
      mockDomain2.id = 2;
      domainRepository.find.mockResolvedValueOnce([mockDomain, mockDomain2]);

      const result = await domainService.findAll();

      expect(result).toStrictEqual([mockDomain, mockDomain2]);
      expect(domainRepository.find).toHaveBeenCalledWith(/* nothing */);
      expect(domainRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllIncludingDeleted', () => {
    it('should find all domains, including soft deleted', async () => {
      const mockDomain2: any = {};
      Object.assign(mockDomain2, mockDomain);
      mockDomain2.id = 2;
      domainRepository
        .createQueryBuilder()
        .withDeleted()
        .getMany.mockResolvedValueOnce([
          mockDomain,
          mockDomain2,
          mockDeletedDomain,
        ]);

      const result = await domainService.findAllIncludingDeleted();

      expect(result).toStrictEqual([
        mockDomain,
        mockDomain2,
        mockDeletedDomain,
      ]);
      expect(
        domainRepository.createQueryBuilder().withDeleted,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        domainRepository.createQueryBuilder().withDeleted().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        domainRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllDeleted', () => {
    it('should find all users, including soft deleted', async () => {
      domainRepository
        .createQueryBuilder()
        .withDeleted()
        .where()
        .getMany.mockResolvedValueOnce([mockDeletedDomain]);

      const result = await domainService.findAllDeleted();

      expect(result).toStrictEqual([mockDeletedDomain]);
      expect(
        domainRepository.createQueryBuilder().withDeleted,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        domainRepository.createQueryBuilder().withDeleted().where,
      ).toHaveBeenCalledWith('deleted_at is not null');
      expect(
        domainRepository.createQueryBuilder().withDeleted().getMany,
      ).toHaveBeenCalledWith(/* nothing */);
      expect(
        domainRepository.createQueryBuilder().where().getMany,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOneById', () => {
    it('should return domain', async () => {
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);

      const result = await domainService.findOneById(mockDomain.id);

      expect(domainRepository.findOne).toHaveBeenCalledWith({
        id: mockDomain.id,
      });
      expect(domainRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('findOneByName', () => {
    it('should return domain', async () => {
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);

      const result = await domainService.findOneByName(mockDomain.name);

      expect(domainRepository.findOne).toHaveBeenCalledWith({
        name: mockDomain.name,
      });
      expect(domainRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('updateOne', () => {
    it('should update domain fields', async () => {
      const updateDto: any = {
        lastCheckedDNS: true,
      };
      const updatedDomain = {
        ...mockDomain,
        ...updateDto,
      };
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);
      mockDomain.save.mockResolvedValueOnce(updatedDomain);

      const result = await domainService.updateOne({
        user: mockUser as User,
        id: mockDomain.id,
        fieldsToUpdate: updateDto,
      });

      expect(domainRepository.findOne).toHaveBeenCalledWith({
        id: mockDomain.id,
      });
      expect(domainRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockDomain.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockDomain.save).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('when db throws unknown error, should throw InternalServerErrorException', async () => {
      const updateDto: any = {
        lastCheckedDNS: true,
      };
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);
      mockDomain.save.mockRejectedValueOnce(new Error('db error'));

      const error = await domainService
        .updateOne({
          user: mockUser as User,
          id: mockDomain.id,
          fieldsToUpdate: updateDto,
        })
        .catch((e) => e);

      expect(domainRepository.findOne).toHaveBeenCalledWith({
        id: mockDomain.id,
      });
      expect(domainRepository.findOne).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(error).toMatchInlineSnapshot(`[Error: Internal Server Error]`);
      expect(mockDomain.save).toHaveBeenCalledWith(/* nothing */);
      expect(mockDomain.save).toHaveBeenCalledTimes(1);
    });

    it('when user does not own domain, should throw UnauthorizedException', async () => {
      const updateDto: any = {
        lastCheckedDNS: true,
      };
      const mockUnownedDomain = {
        ...mockDomain,
        user: {
          ...mockUser,
          id: mockUser.id + 1,
        },
      };
      domainRepository.findOne.mockResolvedValueOnce(mockUnownedDomain);
      // mockDomain.save.mockRejectedValueOnce(new Error('db error'));

      const error = await domainService
        .updateOne({
          user: mockUser as User,
          id: mockUnownedDomain.id,
          fieldsToUpdate: updateDto,
        })
        .catch((e) => e);

      expect(domainRepository.findOne).toHaveBeenCalledWith({
        id: mockUnownedDomain.id,
      });
      expect(domainRepository.findOne).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error).toMatchInlineSnapshot(`[Error: Unauthorized]`);
    });

    it('when updateDto has no updates, return user unchanged', async () => {
      const updateDto: any = {
        lastCheckedDNS: undefined,
      };
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);

      const result = await domainService.updateOne({
        user: mockUser as User,
        id: mockDomain.id,
        fieldsToUpdate: updateDto,
      });

      expect(domainRepository.findOne).toHaveBeenCalledWith({
        id: mockDomain.id,
      });
      expect(domainRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      expect(mockDomain.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should softDelete a domain', async () => {
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);
      domainRepository.softDelete.mockResolvedValueOnce({ affected: 1 });

      const result = await domainService.deleteOne({
        id: mockDomain.user,
        user: mockUser as User,
      });

      expect(domainRepository.softDelete).toHaveBeenCalledWith(mockDomain.id);
      expect(domainRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it("when db doesn't soft delete, should throw InternalServerErrorException", async () => {
      domainRepository.findOne.mockResolvedValueOnce(mockDomain);
      domainRepository.softDelete.mockResolvedValueOnce({ affected: 0 });

      const error = await domainService
        .deleteOne({ id: mockDomain.user, user: mockUser as User })
        .catch((e) => e);

      expect(domainRepository.softDelete).toHaveBeenCalledWith(mockDomain.id);
      expect(domainRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(InternalServerErrorException);
    });
  });
});
