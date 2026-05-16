import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStatusName, ProjectTypeName } from '../domain/types';

const STATUS_VALUES: ProjectStatusName[] = [
  'quoting',
  'received',
  'construction',
  'completed',
  'handed_over',
  'cancelled',
];
const TYPE_VALUES: ProjectTypeName[] = [
  'new_construction',
  'remodel',
  'repair',
  'aftercare',
];

function splitCsv(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string')
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return undefined;
}

export class ListProjectsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => splitCsv(value))
  @IsArray()
  @IsEnum(STATUS_VALUES, { each: true })
  status?: ProjectStatusName[];

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => splitCsv(value))
  @IsArray()
  @IsEnum(TYPE_VALUES, { each: true })
  projectType?: ProjectTypeName[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'scheduleStart', 'projectCode'])
  sortBy?: 'createdAt' | 'updatedAt' | 'scheduleStart' | 'projectCode';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

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
