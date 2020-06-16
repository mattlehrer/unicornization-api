import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainModule } from 'src/domain/domain.module';
import { VoteModule } from 'src/vote/vote.module';
import { IdeaController } from './idea.controller';
import { Idea } from './idea.entity';
import { IdeaService } from './idea.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Idea]),
    DomainModule,
    forwardRef(() => VoteModule),
  ],
  providers: [IdeaService],
  controllers: [IdeaController],
  exports: [IdeaService],
})
export class IdeaModule {}
