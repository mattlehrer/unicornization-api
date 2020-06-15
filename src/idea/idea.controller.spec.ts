import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IUserRequest } from 'src/shared/interfaces/user-request.interface';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { IdeaController } from './idea.controller';
import { IdeaService } from './idea.service';

jest.mock('./idea.service');

const mockUser = {
  id: 1,
};
const mockDomain = { id: 1, name: 'mock.com' };
const createIdeaDto: CreateIdeaDto = {
  headline: 'uber for mocks',
  domainId: mockDomain.id,
};
const mockIdea = {
  id: 100,
  ...createIdeaDto,
};
const mockReq: any = {
  user: mockUser,
};

describe('Idea Controller', () => {
  let ideaController: IdeaController;
  let ideaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdeaController],
      providers: [IdeaService],
    }).compile();

    ideaController = module.get<IdeaController>(IdeaController);
    ideaService = module.get<IdeaService>(IdeaService);
  });

  it('should be defined', () => {
    expect(ideaController).toBeDefined();
  });

  describe('POST /idea', () => {
    it('should call ideaService.create', async () => {
      ideaService.create.mockResolvedValueOnce(mockDomain);

      const result = await ideaController.create(
        mockReq as IUserRequest,
        createIdeaDto,
      );

      expect(ideaService.create).toHaveBeenCalledWith({
        user: mockUser,
        ...createIdeaDto,
      });
      expect(ideaService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('GET /idea/:id', () => {
    it('should return an idea by id', async () => {
      ideaService.findOneById.mockResolvedValueOnce(mockIdea);
      mockReq.params = {
        id: mockIdea.id,
      };

      const response = await ideaController.getById(mockReq.params.id);

      expect(ideaService.findOneById).toHaveBeenCalledWith(mockIdea.id);
      expect(ideaService.findOneById).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockIdea);
    });

    it('should return a 404 if idea not found', async () => {
      ideaService.findOneById.mockResolvedValueOnce(undefined);
      const nonExistingIdea = {
        id: 101,
        domain: mockDomain,
        headline: 'blah',
      };

      const error = await ideaController
        .getById(nonExistingIdea.id)
        .catch((e) => e);

      expect(ideaService.findOneById).toHaveBeenCalledWith(nonExistingIdea.id);
      expect(ideaService.findOneById).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('GET /idea/domain/:id', () => {
    it('should return all ideas for a domain', async () => {
      ideaService.findAllIdeasForADomain.mockResolvedValueOnce([mockIdea]);
      mockReq.param = {
        id: mockDomain.id,
      };

      const response = await ideaController.getAllIdeasForADomain(
        mockReq.param.id,
      );

      expect(ideaService.findAllIdeasForADomain).toHaveBeenCalledWith(
        mockDomain.id,
      );
      expect(ideaService.findAllIdeasForADomain).toHaveBeenCalledTimes(1);
      expect(response).toEqual([mockIdea]);
    });
  });

  describe('GET /idea/user/:id', () => {
    it('should return all ideas of a user', async () => {
      ideaService.findAllIdeasOfAUser.mockResolvedValueOnce([mockIdea]);
      mockReq.param = {
        id: mockUser.id,
      };

      const response = await ideaController.getAllIdeasOfAUser(
        mockReq.param.id,
      );

      expect(ideaService.findAllIdeasOfAUser).toHaveBeenCalledWith(mockUser.id);
      expect(ideaService.findAllIdeasOfAUser).toHaveBeenCalledTimes(1);
      expect(response).toEqual([mockIdea]);
    });
  });

  describe('PATCH /idea/:id', () => {
    it('should call ideaService.updateOne and return void', async () => {
      const updateDto: UpdateIdeaDto = {
        description: 'better description',
      };
      mockReq.params = {
        id: 100,
      };
      ideaService.updateOne.mockResolvedValueOnce(undefined);

      const response = await ideaController.update(
        mockReq,
        mockReq.params.id,
        updateDto,
      );

      expect(ideaService.updateOne).toHaveBeenCalledWith({
        user: mockReq.user,
        id: mockReq.params.id,
        fieldsToUpdate: updateDto,
      });
      expect(ideaService.updateOne).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });

  describe('DELETE /idea/:id', () => {
    it('should call ideaService.deleteOne and return void', async () => {
      mockReq.params = {
        id: 100,
      };
      ideaService.deleteOne.mockResolvedValueOnce(undefined);

      const response = await ideaController.delete(mockReq, mockReq.params.id);

      expect(ideaService.deleteOne).toHaveBeenCalledWith({
        user: mockReq.user,
        id: mockReq.params.id,
      });
      expect(ideaService.deleteOne).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });
});
