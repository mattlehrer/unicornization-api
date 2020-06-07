import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Idea } from 'src/idea/idea.entity';
import { IUserRequest } from 'src/shared/interfaces/user-request.interface';
import { CreateVoteDto } from './dto/create-vote.dto';
import { UpdateVoteDto } from './dto/update-vote.dto';
import { VoteType } from './vote-types.enum';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';

jest.mock('./vote.service');

const mockUser = {
  id: 1,
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
const createVoteDto: CreateVoteDto = {
  type: VoteType.UP,
  idea: mockIdea as Idea,
};
const mockVote: any = {
  id: 1001,
  ...createVoteDto,
};
const mockReq: any = {
  user: mockUser,
};

describe('Vote Controller', () => {
  let voteController: VoteController;
  let voteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoteController],
      providers: [VoteService],
    }).compile();

    voteController = module.get<VoteController>(VoteController);
    voteService = module.get<VoteService>(VoteService);
  });

  it('should be defined', () => {
    expect(voteController).toBeDefined();
  });

  describe('POST /domain', () => {
    it('should call voteService.create', async () => {
      voteService.create.mockResolvedValueOnce(mockDomain);

      const result = await voteController.create(
        mockReq as IUserRequest,
        createVoteDto,
      );

      expect(voteService.create).toHaveBeenCalledWith({
        user: mockUser,
        ...createVoteDto,
      });
      expect(voteService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('GET /vote/:id', () => {
    it('should return an idea by id', async () => {
      voteService.findOneById.mockResolvedValueOnce(mockVote);
      mockReq.params = {
        id: mockVote.id,
      };

      const response = await voteController.getById(mockReq.params.id);

      expect(voteService.findOneById).toHaveBeenCalledWith(mockVote.id);
      expect(voteService.findOneById).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockVote);
    });

    it('should return a 404 if idea not found', async () => {
      voteService.findOneById.mockResolvedValueOnce(undefined);
      const nonExistingIdea = {
        id: 1001,
        domain: mockDomain,
        headline: 'blah',
      };

      const error = await voteController
        .getById(nonExistingIdea.id)
        .catch((e) => e);

      expect(voteService.findOneById).toHaveBeenCalledWith(nonExistingIdea.id);
      expect(voteService.findOneById).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('GET /vote/user/:id', () => {
    it('should return all votes of a user', async () => {
      voteService.findAllVotesOfAUser.mockResolvedValueOnce([mockVote]);
      mockReq.param = {
        id: mockUser.id,
      };

      const response = await voteController.getAllVotesOfAUser(
        mockReq.param.id,
      );

      expect(voteService.findAllVotesOfAUser).toHaveBeenCalledWith(mockUser.id);
      expect(voteService.findAllVotesOfAUser).toHaveBeenCalledTimes(1);
      expect(response).toEqual([mockVote]);
    });
  });

  describe('GET /vote/idea/:id', () => {
    it('should return all votes on an idea', async () => {
      voteService.findAllVotesOfAnIdea.mockResolvedValueOnce([mockVote]);
      mockReq.param = {
        id: mockIdea.id,
      };

      const response = await voteController.getAllVotesOfAnIdea(
        mockReq.param.id,
      );

      expect(voteService.findAllVotesOfAnIdea).toHaveBeenCalledWith(
        mockIdea.id,
      );
      expect(voteService.findAllVotesOfAnIdea).toHaveBeenCalledTimes(1);
      expect(response).toEqual([mockVote]);
    });
  });

  describe('PATCH /vote/:id', () => {
    it('should call voteService.updateOne and return void', async () => {
      const updateDto: UpdateVoteDto = {
        type: VoteType.DOWN,
        idea: mockIdea,
      };
      mockReq.params = {
        id: 100,
      };
      voteService.updateOne.mockResolvedValueOnce(undefined);

      const response = await voteController.update(
        mockReq,
        mockReq.params.id,
        updateDto,
      );

      expect(voteService.updateOne).toHaveBeenCalledWith({
        user: mockReq.user,
        id: mockReq.params.id,
        fieldsToUpdate: updateDto,
      });
      expect(voteService.updateOne).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });

  describe('DELETE /vote/:id', () => {
    it('should call voteService.deleteOne and return void', async () => {
      mockReq.params = {
        id: 100,
      };
      voteService.deleteOne.mockResolvedValueOnce(undefined);

      const response = await voteController.delete(mockReq, mockReq.params.id);

      expect(voteService.deleteOne).toHaveBeenCalledWith({
        user: mockReq.user,
        id: mockReq.params.id,
      });
      expect(voteService.deleteOne).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });
});
