import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DashboardSummaryService } from '../services/dashboard-summary.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly summary: DashboardSummaryService) {}

  @Get('summary')
  @Roles('system_admin', 'manager', 'employee')
  async getSummary() {
    return this.summary.getSummary();
  }
}
