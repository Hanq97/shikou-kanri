import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const RECORD_TYPES = [
  'inspection',
  'repair',
  'inquiry',
  'complaint',
  'other',
] as const;

const RECORD_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export class CreateAftercareRecordDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsEnum(RECORD_TYPES)
  recordType!: (typeof RECORD_TYPES)[number];

  @IsOptional()
  @IsEnum(RECORD_STATUSES)
  status?: (typeof RECORD_STATUSES)[number];

  @IsDateString()
  occurredAt!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsUUID()
  handledById?: string;
}
