import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { NotificationModule } from '../notification';
import { BatchController } from './controllers/batch.controller';
import { ObCustomersController } from './controllers/ob-customers.controller';
import { SchedulesController } from './controllers/schedules.controller';
import { ScheduleGeneratorService } from './internal/schedule-generator.service';
import { AftercareRecordRepository } from './repositories/aftercare-record.repository';
import { MaintenanceScheduleRepository } from './repositories/maintenance-schedule.repository';
import { AftercareBatchService } from './services/aftercare-batch.service';
import { ObCustomersService } from './services/ob-customers.service';
import { SchedulesService } from './services/schedules.service';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [ObCustomersController, SchedulesController, BatchController],
  providers: [
    ObCustomersService,
    SchedulesService,
    AftercareBatchService,
    ScheduleGeneratorService,
    MaintenanceScheduleRepository,
    AftercareRecordRepository,
  ],
  exports: [
    SchedulesService,
    AftercareBatchService,
    ScheduleGeneratorService,
    MaintenanceScheduleRepository,
    AftercareRecordRepository,
  ],
})
export class AftercareModule {}
