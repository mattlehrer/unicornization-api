import { Domain } from './domain.entity';

jest.mock('src/user/user.entity');
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

describe('DomainEntity', () => {
  it('should be defined', async () => {
    const domain = new Domain();

    expect(domain).toBeDefined();
  });
});
