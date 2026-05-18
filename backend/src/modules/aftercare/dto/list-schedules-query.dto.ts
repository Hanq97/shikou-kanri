import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const SCHEDULE_STATUSES = [
  'pending',
  'notified',
  'overdue',
  'completed',
  'cancelled',
] as const;
const SCHEDULE_TYPES = [
  'one_year',
  'three_year',
  'five_year',
  'ten_year',
  'custom',
] as const;

export class ListSchedulesQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsEnum(SCHEDULE_STATUSES, { each: true })
  status?:
    | (typeof SCHEDULE_STATUSES)[number]
    | (typeof SCHEDULE_STATUSES)[number][];

  @IsOptional()
  @IsEnum(SCHEDULE_TYPES)
  scheduleType?: (typeof SCHEDULE_TYPES)[number];

  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @IsOptional()
  @IsDateString()
  scheduledTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
