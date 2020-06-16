import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdeaModule } from 'src/idea/idea.module';
import { VoteController } from './vote.controller';
import { Vote } from './vote.entity';
import { VoteService } from './vote.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vote]), forwardRef(() => IdeaModule)],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService],
})
export class VoteModule {}
