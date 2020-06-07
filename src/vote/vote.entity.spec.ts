import { Vote } from './vote.entity';

jest.mock('src/user/user.entity');
jest.mock('src/domain/domain.entity');
jest.mock('src/idea/idea.entity');
jest.mock('typeorm', () => ({
  BaseEntity: jest.fn(),
  BeforeInsert: jest.fn(),
  BeforeUpdate: jest.fn(),
  Column: jest.fn(),
  CreateDateColumn: jest.fn(),
  DeleteDateColumn: jest.fn(),
  UpdateDateColumn: jest.fn(),
  Entity: jest.fn(),
  ManyToOne: jest.fn((cb) => cb()),
  PrimaryGeneratedColumn: jest.fn(),
}));

describe('VoteEntity', () => {
  it('should be defined', async () => {
    const vote = new Vote();

    expect(vote).toBeDefined();
  });
});
