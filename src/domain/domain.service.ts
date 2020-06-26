import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as dns from 'dns';
import { InjectEventEmitter } from 'nest-emitter';
import { RedisService } from 'nestjs-redis';
import * as psl from 'psl';
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
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(DomainService.name);
  }

  async create({ name, user }: { name: FQDN; user: User }): Promise<Domain> {
    // ensure only second level domains are added
    const domainName = psl.get(name);
    if (domainName !== toFQDN(name))
      throw new BadRequestException('Not a second level domain');

    // only create domain if dns is set up
    const hasVerifiedDNS = await this.verifyDNS(domainName);
    if (!hasVerifiedDNS) throw new BadRequestException('DNS not configured');
    // TODO:
    // add to queue to verify dns and save anyway
    const domain = this.domainRepository.create({
      name: domainName,
      user,
      hasVerifiedDNS,
      lastVerifiedDNS: new Date(),
    });
    await this.handleSave(domain);
    await this.addDomainToTraefik(domain.name);

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
    const parsed = psl.parse(name);
    if (parsed.error) throw new BadRequestException();
    const parsedDomain = parsed as psl.ParsedDomain;
    if (![null, 'www'].includes(parsedDomain.subdomain))
      throw new NotFoundException();
    return await this.domainRepository.findOne({ name: parsedDomain.domain });
  }

  async findAllDomainsOfAUser(userId: number): Promise<Domain[]> {
    return await this.domainRepository
      .createQueryBuilder('domain')
      .where('domain.user = :userId', { userId })
      .getMany();
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

    // Unauthorized vs NotFound better for security?
    if (!domain) throw new UnauthorizedException();

    this.continueIfAuthorized(domain, user);

    const result = await this.domainRepository.softDelete(domain.id);
    return this.handleDbUpdateResult(result);
  }

  async addDomainToTraefik(domain: FQDN): Promise<void> {
    const redisPipeline = this.redisService.getClient().multi();
    const results = await redisPipeline
      // https://docs.traefik.io/reference/dynamic-configuration/kv/
      // https://docs.traefik.io/routing/routers/
      .set(
        `traefik/http/routers/${domain}/rule`,
        `Host(\`${domain}\`) || Host(\`www.${domain}\`)`,
      )
      .set(`traefik/http/routers/${domain}/tls`, 'true')
      .set(`traefik/http/routers/${domain}/tls/certResolver`, 'letsencrypt')
      .set(
        `traefik/http/routers/${domain}/service`,
        this.configService.get('traefik.service'),
      )
      .exec();

    // TODO: if error, add to queue to try again?
    // what are possible errors besides redis going down?
    if (results.some((res) => res[0]))
      throw new InternalServerErrorException(results);
    this.logger.log(
      `Added Traefik rules for ${domain}\nRedis response: ${JSON.stringify(
        results,
      )}`,
    );

    return;
  }

  /* 
  
  use a jobs queue
  https://docs.nestjs.com/techniques/queues
  
  */

  async verifyDNS(hostName: FQDN): Promise<boolean> {
    const resolver = new dns.promises.Resolver();
    let results: string[];
    try {
      results = await resolver.resolve4(hostName);
      this.logger.debug(results);
      return results[0] === this.configService.get('traefik.ip');
    } catch (err) {
      this.logger.error(JSON.stringify(err));
    }
    return false;
  }

  private continueIfAuthorized(domain: Domain, user: User) {
    if (domain.user.id !== user.id && !user.isAdmin()) {
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
        throw new ConflictException(error, error.detail);
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
