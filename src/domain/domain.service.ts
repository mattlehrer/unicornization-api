import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectEventEmitter } from 'nest-emitter';
import { LoggerService } from 'src/logger/logger.service';
import { PostgresErrorCode } from 'src/shared/interfaces/postgres.enum';
import { User } from 'src/user/user.entity';
import { Repository, UpdateResult } from 'typeorm';
import { Domain, FQDN } from './domain.entity';
import { DomainEventEmitter } from './domain.events';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { toFQDN } from './fqdn.transformer';

@Injectable()
export class DomainService {
  constructor(
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    @InjectEventEmitter() private readonly emitter: DomainEventEmitter,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DomainService.name);
  }

  async create({ name, user }: { name: FQDN; user: User }): Promise<Domain> {
    const domain = this.domainRepository.create({ name, user });

    await this.handleSave(domain);

    this.emitter.emit('newDomain', domain);

    return domain;
  }

  async findAll(): Promise<Domain[]> {
    return this.domainRepository.find();
  }

  async findAllIncludingDeleted(): Promise<Domain[]> {
    return await this.domainRepository
      .createQueryBuilder('domain')
      .withDeleted()
      .getMany();
  }

  async findAllDeleted(): Promise<Domain[]> {
    return await this.domainRepository
      .createQueryBuilder('domain')
      .withDeleted()
      .where('deleted_at is not null')
      .getMany();
  }

  async findOneById(id: number): Promise<Domain> {
    return await this.domainRepository.findOne({ id });
  }

  async findOneByName(name: FQDN): Promise<Domain> {
    return await this.domainRepository.findOne({ name: toFQDN(name) });
  }

  async updateOne({
    user,
    id,
    fieldsToUpdate,
  }: {
    user: User;
    id: number;
    fieldsToUpdate: UpdateDomainDto;
  }): Promise<void> {
    const domain = await this.findOneById(id);

    this.continueIfAuthorized(domain, user);

    // Remove undefined keys for update
    for (const key in fieldsToUpdate) {
      if (typeof fieldsToUpdate[key] === 'undefined') {
        delete fieldsToUpdate[key];
      } else {
        domain[key] = fieldsToUpdate[key];
      }
    }

    if (Object.entries(fieldsToUpdate).length > 0) {
      await this.handleSave(domain);
    }

    return;
  }

  async deleteOne({ id, user }: { id: number; user: User }): Promise<void> {
    const domain = await this.findOneById(id);

    this.continueIfAuthorized(domain, user);

    const result = await this.domainRepository.softDelete(domain.id);
    return this.handleDbUpdateResult(result);
  }

  /* 
  
  TODO: Verify DNS
  https://nodejs.org/api/dns.html
  
  use a jobs queue
  https://docs.nestjs.com/techniques/queues
  
  */

  private continueIfAuthorized(domain: Domain, user: User) {
    if (domain.user !== user && !user.isAdmin()) {
      throw new UnauthorizedException();
    }
  }

  private async handleSave(domain: Domain) {
    try {
      await domain.save();
    } catch (error) {
      if (error.code === PostgresErrorCode.UniqueViolation) {
        // duplicate on unique column
        error.detail = error.detail
          .replace('Key ("', '')
          .replace('")=(', " '")
          .replace(')', "'");
        throw new ConflictException(error.detail);
      } else {
        this.logger.error({ error });
        throw new InternalServerErrorException();
      }
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
