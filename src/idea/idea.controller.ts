import {
  Body,
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
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IUserRequest } from 'src/shared/interfaces/user-request.interface';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { Idea } from './idea.entity';
import { IdeaService } from './idea.service';

@Controller('idea')
export class IdeaController {
  constructor(private readonly ideaService: IdeaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: IUserRequest,
    @Body(ValidationPipe) createIdeaDto: CreateIdeaDto,
  ): Promise<Idea> {
    return this.ideaService.create({
      ...createIdeaDto,
      user: req.user,
    });
  }

  @Get('/:id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Idea> {
    const idea = await this.ideaService.findOneById(id);
    if (idea) return idea;
    throw new NotFoundException();
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
    fieldsToUpdate: UpdateIdeaDto,
  ): Promise<void> {
    return await this.ideaService.updateOne({
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
    return await this.ideaService.deleteOne({ user: req.user, id });
  }
}
