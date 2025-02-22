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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { VoteType } from './vote-types.enum';

@Exclude()
@Unique(['user', 'idea'])
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
    type: 'int',
  })
  type: VoteType;

  @Expose()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Expose()
  @ManyToOne(() => Idea, (idea) => idea.votes, { onDelete: 'CASCADE' })
  idea: Idea;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
