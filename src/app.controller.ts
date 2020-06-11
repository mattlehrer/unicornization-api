import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthService } from './auth/auth.service';
import { IUserRequest } from './shared/interfaces/user-request.interface';
import { ResendVerifyEmailDto } from './user/dto/resend-verify-email.dto';
import { UpdateUserInput } from './user/dto/update-user.dto';
import { User } from './user/user.entity';
import { UserService } from './user/user.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AppController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getMe(@Request() req: IUserRequest): Promise<User> {
    return await this.userService.findOneById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Patch('/me')
  async updateMe(
    @Request() req: IUserRequest,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    updateUserInput: UpdateUserInput,
  ): Promise<void> {
    const user = await this.userService.updateOne(req.user, updateUserInput);
    req.user = user;
    this.authService.addJwtToCookie(req);
    return;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/me')
  async deleteMe(@Request() req: IUserRequest): Promise<void> {
    return await this.userService.deleteOne(req.user);
  }

  @Get('/verify-email/:code')
  async getVerifyEmail(@Param('code') code: string): Promise<boolean> {
    return !!(await this.userService.verifyEmailToken(code));
  }

  @Post('/resend-verify-email/')
  async resendVerifyEmail(
    @Body(ValidationPipe) resendVerifyEmailDto: ResendVerifyEmailDto,
  ): Promise<void> {
    return await this.userService.resendEmailVerification(resendVerifyEmailDto);
  }
}
