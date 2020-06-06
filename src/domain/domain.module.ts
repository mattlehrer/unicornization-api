import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'nestjs-redis';
import { DomainController } from './domain.controller';
import { Domain } from './domain.entity';
import { DomainService } from './domain.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Domain]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('redis'),
    }),
  ],
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
