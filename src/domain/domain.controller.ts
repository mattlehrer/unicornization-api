import {
  BadRequestException,
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
import * as psl from 'psl';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IUserRequest } from 'src/shared/interfaces/user-request.interface';
import { Domain, FQDN } from './domain.entity';
import { DomainService } from './domain.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('domain')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: IUserRequest,
    @Body(ValidationPipe) createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
    return this.domainService.create({
      name: createDomainDto.name,
      user: req.user,
    });
  }

  @Get('/:name')
  async getByName(@Param('name') name: FQDN): Promise<Domain> {
    let parsedHost: psl.ParsedDomain & psl.ParseError;
    let parseError: psl.ParseError;
    try {
      parsedHost = psl.parse(name) as psl.ParsedDomain;
    } catch (err) {
      parseError = err;
    }
    if (parseError || !parsedHost.domain)
      throw new BadRequestException('Not an FQDN');
    const parsedDomain = parsedHost as psl.ParsedDomain;
    if (![null, 'www'].includes(parsedDomain.subdomain))
      throw new BadRequestException('Only second level domains are valid');
    const domain = await this.domainService.findOneByName(parsedDomain.domain);
    if (domain) return domain;
    throw new NotFoundException();
  }

  @Get('/user/:id')
  async getAllDomainsOfAUser(@Param('id') userId: number): Promise<Domain[]> {
    return await this.domainService.findAllDomainsOfAUser(userId);
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
    fieldsToUpdate: UpdateDomainDto,
  ): Promise<void> {
    return await this.domainService.updateOne({
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
    return await this.domainService.deleteOne({ user: req.user, id });
  }
}
