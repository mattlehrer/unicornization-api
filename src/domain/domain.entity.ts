import { Exclude, Expose } from 'class-transformer';
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
import { fromFQDN, toFQDN } from './fqdn.transformer';

@Exclude()
@Entity()
export class Domain extends BaseEntity {
  constructor(args: any = {}) {
    super();
    Object.assign(this, args);
  }

  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @Column({
    unique: true,
    transformer: {
      from: fromFQDN,
      to: toFQDN,
    },
  })
  name: FQDN;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Expose()
  @Column({
    default: false,
  })
  hasVerifiedDNS: boolean;

  @Expose()
  @Column({
    nullable: true,
  })
  lastVerifiedDNS: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}

export type FQDN = string;
