import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IUserRequest } from 'src/shared/interfaces/user-request.interface';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

jest.mock('./domain.service');
const mockUser = {
  id: 1,
};
const createDomainDto: CreateDomainDto = {
  name: 'mock.com',
};
const mockReq: any = { user: mockUser };
const mockDomain = { id: 1, ...createDomainDto };

describe('Domain Controller', () => {
  let domainController: DomainController;
  let domainService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DomainController],
      providers: [DomainService],
    }).compile();

    domainController = module.get<DomainController>(DomainController);
    domainService = module.get<DomainService>(DomainService);
  });

  it('should be defined', () => {
    expect(domainController).toBeDefined();
  });

  describe('POST /domain', () => {
    it('should call domainService.create', async () => {
      domainService.create.mockResolvedValueOnce(mockDomain);

      const result = await domainController.create(
        mockReq as IUserRequest,
        createDomainDto,
      );

      expect(domainService.create).toHaveBeenCalledWith({
        user: mockUser,
        ...createDomainDto,
      });
      expect(domainService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('GET /domain/:name', () => {
    it('should return a domain by name', async () => {
      domainService.findOneByName.mockResolvedValueOnce(mockDomain);
      mockReq.params = {
        name: mockDomain.name,
      };

      const response = await domainController.getByName(mockReq.params.name);

      expect(domainService.findOneByName).toHaveBeenCalledWith(mockDomain.name);
      expect(domainService.findOneByName).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockDomain);
    });

    it('should return a 404 if domain not found', async () => {
      domainService.findOneByName.mockResolvedValueOnce(undefined);
      const nonExistingDomain = 'test.com';

      const error = await domainController
        .getByName(nonExistingDomain)
        .catch((e) => e);

      expect(domainService.findOneByName).toHaveBeenCalledWith(
        nonExistingDomain,
      );
      expect(domainService.findOneByName).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('PATCH /domain/:id', () => {
    it('should call domainService.updateOne and return void', async () => {
      const updateDto: UpdateDomainDto = {
        lastCheckedDNS: new Date(),
      };
      mockReq.params = {
        id: 1,
      };
      domainService.updateOne.mockResolvedValueOnce(undefined);

      const response = await domainController.update(
        mockReq,
        mockReq.params.id,
        updateDto,
      );

      expect(domainService.updateOne).toHaveBeenCalledWith({
        user: mockReq.user,
        id: mockReq.params.id,
        fieldsToUpdate: updateDto,
      });
      expect(domainService.updateOne).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });

  describe('DELETE /domain/:id', () => {
    it('should call domainService.deleteOne and return void', async () => {
      mockReq.params = {
        id: 1,
      };
      domainService.deleteOne.mockResolvedValueOnce(undefined);

      const response = await domainController.delete(
        mockReq,
        mockReq.params.id,
      );

      expect(domainService.deleteOne).toHaveBeenCalledWith({
        user: mockReq.user,
        id: mockReq.params.id,
      });
      expect(domainService.deleteOne).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });
});
