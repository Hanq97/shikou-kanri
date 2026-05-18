import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const RECORD_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export class UpdateAftercareRecordDto {
  @IsOptional()
  @IsEnum(RECORD_STATUSES)
  status?: (typeof RECORD_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsUUID()
  handledById?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
