import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { ObCustomersController } from './controllers/ob-customers.controller';
import { SchedulesController } from './controllers/schedules.controller';
import { ScheduleGeneratorService } from './internal/schedule-generator.service';
import { AftercareRecordRepository } from './repositories/aftercare-record.repository';
import { MaintenanceScheduleRepository } from './repositories/maintenance-schedule.repository';
import { ObCustomersService } from './services/ob-customers.service';
import { SchedulesService } from './services/schedules.service';

@Module({
  imports: [AuthModule],
  controllers: [ObCustomersController, SchedulesController],
  providers: [
    ObCustomersService,
    SchedulesService,
    ScheduleGeneratorService,
    MaintenanceScheduleRepository,
    AftercareRecordRepository,
  ],
  exports: [
    SchedulesService,
    ScheduleGeneratorService,
    MaintenanceScheduleRepository,
    AftercareRecordRepository,
  ],
})
export class AftercareModule {}
