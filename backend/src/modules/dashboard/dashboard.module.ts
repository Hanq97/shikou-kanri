import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardSummaryService } from './services/dashboard-summary.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardSummaryService],
  exports: [DashboardSummaryService],
})
export class DashboardModule {}
