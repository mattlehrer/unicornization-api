import { Exclude, Expose } from 'class-transformer';
import { Idea } from 'src/idea/idea.entity';
import { User } from 'src/user/user.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoteType } from './vote-types.enum';

@Exclude()
@Entity()
export class Vote extends BaseEntity {
  constructor(args: any = {}) {
    super();
    Object.assign(this, args);
  }

  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @Column({
    type: 'enum',
    enum: VoteType,
    enumName: 'VoteType',
  })
  type: VoteType;

  @Expose()
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @ManyToOne(() => Idea, (idea) => idea.votes, { onDelete: 'CASCADE' })
  idea: Idea;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}

export type FQDN = string;
