import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EventEmitter } from 'events';
import { NestEmitterModule } from 'nest-emitter';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import databaseConfig from './config/typeorm.config';
import validationSchema from './config/validation-schema';
import { DomainModule } from './domain/domain.module';
import { IdeaModule } from './idea/idea.module';
import { LoggerModule } from './logger/logger.module';
import { EmailToken } from './user/email-token.entity';
import { UserModule } from './user/user.module';
import { VoteModule } from './vote/vote.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      validationSchema,
    }),
    LoggerModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('database') as TypeOrmModuleOptions,
    }),
    TypeOrmModule.forFeature([EmailToken]),
    AuthModule,
    UserModule,
    NestEmitterModule.forRoot(new EventEmitter()),
    AnalyticsModule,
    AdminModule,
    DomainModule,
    IdeaModule,
    VoteModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
