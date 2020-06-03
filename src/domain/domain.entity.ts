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

  @DeleteDateColumn()
  deleted_at: Date;

  @Expose()
  @Column({ unique: true })
  name: string;

  @Expose()
  @ManyToOne(() => User)
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
}
