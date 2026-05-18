import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { NotificationModule } from '../notification';
import { AftercareRecordsController } from './controllers/aftercare-records.controller';
import { AftercareTimelineController } from './controllers/aftercare-timeline.controller';
import { BatchController } from './controllers/batch.controller';
import { ObCustomersController } from './controllers/ob-customers.controller';
import { SchedulesController } from './controllers/schedules.controller';
import { ScheduleGeneratorService } from './internal/schedule-generator.service';
import { AftercareRecordRepository } from './repositories/aftercare-record.repository';
import { MaintenanceScheduleRepository } from './repositories/maintenance-schedule.repository';
import { AftercareBatchService } from './services/aftercare-batch.service';
import { AftercareRecordsService } from './services/aftercare-records.service';
import { ObCustomersService } from './services/ob-customers.service';
import { SchedulesService } from './services/schedules.service';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [
    ObCustomersController,
    SchedulesController,
    AftercareRecordsController,
    AftercareTimelineController,
    BatchController,
  ],
  providers: [
    ObCustomersService,
    SchedulesService,
    AftercareRecordsService,
    AftercareBatchService,
    ScheduleGeneratorService,
    MaintenanceScheduleRepository,
    AftercareRecordRepository,
  ],
  exports: [
    SchedulesService,
    AftercareRecordsService,
    AftercareBatchService,
    ScheduleGeneratorService,
    MaintenanceScheduleRepository,
    AftercareRecordRepository,
  ],
})
export class AftercareModule {}
