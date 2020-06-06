import { Idea } from './idea.entity';

jest.mock('src/user/user.entity');
jest.mock('src/domain/domain.entity');
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

describe('IdeaEntity', () => {
  it('should be defined', async () => {
    const idea = new Idea();

    expect(idea).toBeDefined();
  });
});
