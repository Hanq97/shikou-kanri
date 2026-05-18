import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const RECORD_TYPES = [
  'inspection',
  'repair',
  'inquiry',
  'complaint',
  'other',
] as const;
const RECORD_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export class ListAftercareRecordsQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsEnum(RECORD_STATUSES, { each: true })
  status?:
    | (typeof RECORD_STATUSES)[number]
    | (typeof RECORD_STATUSES)[number][];

  @IsOptional()
  @IsEnum(RECORD_TYPES)
  recordType?: (typeof RECORD_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
