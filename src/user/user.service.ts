import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { classToPlain } from 'class-transformer';
import { InjectEventEmitter } from 'nest-emitter';
import { Profile } from 'passport';
import { ForgotPasswordDto } from 'src/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { SignUpDto } from 'src/auth/dto/sign-up.dto';
import { OAuthProvider } from 'src/auth/interfaces/oauth-providers.interface';
import { EmailService } from 'src/email/email.service';
import { LoggerService } from 'src/logger/logger.service';
import { PostgresErrorCode } from 'src/shared/interfaces/postgres.enum';
import { Repository, UpdateResult } from 'typeorm';
import { v4 as uuid } from 'uuid';
import normalizeEmail from 'validator/lib/normalizeEmail';
import { UpdateUserInput } from './dto/update-user.dto';
import { EmailToken } from './email-token.entity';
import { User } from './user.entity';
import { UserEventEmitter } from './user.events';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectEventEmitter() private readonly emitter: UserEventEmitter,
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(EmailToken)
    private readonly emailTokenRepository: Repository<EmailToken>,
  ) {
    this.logger.setContext(UserService.name);
  }

  async createWithPassword(signUpDto: SignUpDto): Promise<User> {
    const user = this.userRepository.create(signUpDto);
    await this.handleSave(user);

    this.logger.log(
      `Created user: ${JSON.stringify(classToPlain(user), null, 2)}`,
    );

    await this.sendEmailVerification(user);

    this.emitter.emit('newUser', user);
    return user;
  }

  async sendResetPasswordEmail({
    username,
    email,
  }: ForgotPasswordDto): Promise<void> {
    let user: User;
    if (username) {
      user = await this.findOneByUsername(username);
    } else if (email) {
      user = await this.findOneByEmail(email);
    }
    if (!user) return;

    const domain = this.configService.get('email.domain');
    const from = `${this.configService.get(
      'email.from.resetPasswordEmail',
    )}@${domain}`;

    const token = await new EmailToken(user as User).save();
    const frontendBaseUrl = this.configService.get('frontend.baseUrl');
    const msg = {
      to: user.email,
      from,
      subject: `Reset your password on ${domain}`,
      text: `${frontendBaseUrl}/auth/reset-password/${token.code}`,
      html: `<a href='${frontendBaseUrl}/auth/reset-password/${token.code}'>Please click to reset your password</a>`,
    };
    await this.handleEmailSend(msg);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<boolean> {
    const user = await this.verifyEmailToken(resetPasswordDto.code);
    user.password = resetPasswordDto.newPassword;
    await this.handleSave(user);
    return true;
  }

  private async handleEmailSend(msg: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
  }) {
    try {
      await this.emailService.send(msg);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async createWithOAuth({
    profile,
    accessToken,
    refreshToken,
    code,
  }: {
    profile: any;
    accessToken: string;
    refreshToken: string;
    code: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      username: uuid(),
      email: profile._json.email,
      [profile.provider as OAuthProvider]: profile.id,
      tokens: {
        [profile.provider as OAuthProvider]: {
          accessToken,
          refreshToken,
          code,
        },
      },
    });

    await this.handleSave(user);
    this.logger.log(
      `Created user: ${JSON.stringify(classToPlain(user), null, 2)}`,
    );

    await this.sendEmailVerification(user);
    this.emitter.emit('newUser', user);
    return user;
  }

  async findOrCreateOneByOAuth({
    profile,
    accessToken,
    refreshToken,
    code,
  }: {
    profile: any;
    accessToken: string;
    refreshToken: string;
    code: string;
  }): Promise<User> {
    let existingUser = await this.findByProviderId(profile);
    if (!existingUser) {
      // TODO: Create Oauth user without email address
      if (!profile._json.email) throw new UnprocessableEntityException();

      existingUser = await this.findOneByEmail(profile._json.email);
      if (existingUser) {
        existingUser[profile.provider as OAuthProvider] = profile.id;
        existingUser.tokens = {
          [profile.provider as OAuthProvider]: {
            accessToken,
            refreshToken,
            code,
          },
        };
        await this.handleSave(existingUser);
      }
    }
    if (existingUser) {
      return existingUser;
    }

    return await this.createWithOAuth({
      profile,
      accessToken,
      refreshToken,
      code,
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findAllIncludingDeleted(): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .getMany();
  }

  async findAllDeleted(): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .where('deleted_at is not null')
      .getMany();
  }

  async findOneById(id: number): Promise<User> {
    return this.userRepository.findOne({ id });
  }

  async findOneByUsername(username: string): Promise<User> {
    return this.userRepository.findOne({
      normalizedUsername: username.toLowerCase(),
    });
  }

  async findOneByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      normalizedEmail: normalizeEmail(email) as string,
    });
  }

  async findByProviderId(profile: Profile): Promise<User> {
    return this.userRepository
      .createQueryBuilder('user')
      .where(`user.${profile.provider} = :profileId`, { profileId: profile.id })
      .getOne();
  }

  async updateOne(
    user: Partial<User>,
    fieldsToUpdate: UpdateUserInput,
  ): Promise<void> {
    // don't use userRepository.update because
    // @BeforeUpdate listener only runs on save

    user = await this.findOneById(user.id);

    if (fieldsToUpdate.oldPassword) {
      if (await user.validatePassword(fieldsToUpdate.oldPassword)) {
        user.password = fieldsToUpdate.newPassword;
      } else {
        throw new UnauthorizedException('Incorrect existing password.');
      }
    }

    // Remove undefined keys for update
    for (const key in fieldsToUpdate) {
      if (typeof fieldsToUpdate[key] === 'undefined') {
        delete fieldsToUpdate[key];
      } else {
        user[key] = fieldsToUpdate[key];
      }
    }

    if (Object.entries(fieldsToUpdate).length > 0) {
      try {
        await user.save();
      } catch (error) {
        this.handleDbError(error);
      }
    }

    return;
  }

  async deleteOne(user: Partial<User>): Promise<void> {
    const result = await this.userRepository.softDelete(user.id);
    return this.handleDbUpdateResult(result);
  }

  async sendEmailVerification(user: Partial<User>): Promise<void> {
    const from = `${this.configService.get(
      'email.from.verifyEmail',
    )}@${this.configService.get('email.domain')}`;

    const token = await new EmailToken(user as User).save();
    const msg = {
      to: user.email,
      from,
      subject: 'Welcome! Please verify your email address',
      text: `http://localhost:3000/verify-email/${token.code}`,
      html: `<a href='http://localhost:3000/verify-email/${token.code}'>Please click to verify your email</a>`,
    };
    await this.handleEmailSend(msg);
  }

  async verifyEmailToken(code: string): Promise<User> {
    const token = await this.emailTokenRepository.findOne({ code });
    if (token && token.user) {
      if (token.isStillValid()) {
        const user = token.user;
        if (!user.hasVerifiedEmail) user.hasVerifiedEmail = true;
        Promise.all([await token.remove(), await user.save()]);
        return user;
      } else {
        await token.remove();
        throw new GoneException();
      }
    }
    throw new NotFoundException();
  }

  private async handleSave(user: User) {
    try {
      await user.save();
    } catch (error) {
      this.handleDbError(error);
    }
  }

  private handleDbError(error: any) {
    if (error.code === PostgresErrorCode.UniqueViolation) {
      // duplicate on unique column
      error.detail = error.detail
        .replace('Key ("', '')
        .replace('normalized', '')
        .replace('")=(', " '")
        .replace(')', "'");
      throw new ConflictException(error.detail);
    } else {
      this.logger.error({ error });
      throw new InternalServerErrorException();
    }
  }

  private handleDbUpdateResult(result: UpdateResult) {
    if (result.affected) {
      return;
    }
    this.logger.error(result);
    throw new InternalServerErrorException();
  }
}
