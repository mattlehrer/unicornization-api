import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [ConfigModule],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
