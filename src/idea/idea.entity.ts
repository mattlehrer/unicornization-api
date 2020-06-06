import { Exclude, Expose } from 'class-transformer';
import { Domain } from 'src/domain/domain.entity';
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

@Exclude()
@Entity()
export class Idea extends BaseEntity {
  constructor(args: any = {}) {
    super();
    Object.assign(this, args);
  }

  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @Column({ type: 'varchar', length: 100 })
  headline: string;

  @Expose()
  @Column({ nullable: true })
  description?: string;

  /*

  TODO: 
  add 'reported' boolean field? array?
  how should this work?
  add ot admin controller

  */

  @Expose()
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Expose()
  @ManyToOne(() => Domain, { onDelete: 'CASCADE', eager: true })
  domain: Domain;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}

export type FQDN = string;
