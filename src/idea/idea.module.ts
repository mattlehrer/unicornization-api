import { Module } from '@nestjs/common';
import { IdeaService } from './idea.service';
import { IdeaController } from './idea.controller';

@Module({
  providers: [IdeaService],
  controllers: [IdeaController],
})
export class IdeaModule {}
