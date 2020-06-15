import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IUserRequest } from 'src/shared/interfaces/user-request.interface';
import { CreateVoteDto } from './dto/create-vote.dto';
import { UpdateVoteDto } from './dto/update-vote.dto';
import { Vote } from './vote.entity';
import { VoteService } from './vote.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: IUserRequest,
    @Body(ValidationPipe) createVoteDto: CreateVoteDto,
  ): Promise<Vote> {
    return this.voteService.create({
      ...createVoteDto,
      user: req.user,
    });
  }

  @Get('/:id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Vote> {
    const idea = await this.voteService.findOneById(id);
    if (idea) return idea;
    throw new NotFoundException();
  }

  @Get('/user/:id')
  async getAllVotesOfAUser(@Param('id') userId: number): Promise<Vote[]> {
    return await this.voteService.findAllVotesOfAUser(userId);
  }

  @Get('/idea/:id')
  async getAllVotesOfAnIdea(@Param('id') ideaId: number): Promise<Vote[]> {
    return await this.voteService.findAllVotesOfAnIdea(ideaId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Patch('/:id')
  async update(
    @Request() req: IUserRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    fieldsToUpdate: UpdateVoteDto,
  ): Promise<void> {
    return await this.voteService.updateOne({
      user: req.user,
      id,
      fieldsToUpdate,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:id')
  async delete(
    @Request() req: IUserRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return await this.voteService.deleteOne({ user: req.user, id });
  }
}
