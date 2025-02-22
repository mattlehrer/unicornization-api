import * as bcrypt from 'bcryptjs';
import { Exclude, Expose } from 'class-transformer';
import { Role } from 'src/shared/interfaces/roles.enum';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import normalizeEmail from 'validator/lib/normalizeEmail';
import { fromHash, toHash } from './password.transformer';

@Exclude()
@Entity()
export class User extends BaseEntity {
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
  @Column()
  username: string;

  @Column({ unique: true })
  normalizedUsername: string;

  @Expose()
  @Column()
  email: string;

  @Column({
    unique: true,
  })
  normalizedEmail: string;

  @Expose()
  @Column({
    default: false,
  })
  hasVerifiedEmail: boolean;

  @Column({
    nullable: true,
    transformer: {
      from: fromHash,
      to: toHash,
    },
  })
  password?: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'role',
    array: true,
    default: [Role.USER],
  })
  roles: Role[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Expose()
  @Column({ nullable: true })
  google?: string;

  @Expose()
  @Column({ nullable: true })
  facebook?: string;

  @Expose()
  @Column({ nullable: true })
  github?: string;

  @Expose()
  @Column({ nullable: true })
  twitter?: string;

  @Column('json', { nullable: true })
  tokens?: Record<string, unknown>;

  @BeforeInsert()
  @BeforeUpdate()
  normalize(): void {
    this.normalizedEmail = normalizeEmail(this.email) as string;
    this.normalizedUsername = this.username.toLowerCase();
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  }

  public isAdmin(): boolean {
    return this.roles.includes(Role.ADMIN) || this.roles.includes(Role.ROOT);
  }
}
