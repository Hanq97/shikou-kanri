import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { QuoteStatusName } from '../domain/types';

const STATUS_VALUES: QuoteStatusName[] = [
  'draft',
  'submitted',
  'pending_admin',
  'approved',
  'rejected',
  'sent',
  'won',
  'lost',
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

export class ListQuotesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => splitCsv(value))
  @IsArray()
  @IsEnum(STATUS_VALUES, { each: true })
  status?: QuoteStatusName[];

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  counterPartySearch?: string;

  @IsOptional()
  @IsEnum(['issuedAt', 'amountTotal', 'quoteNumber', 'createdAt', 'updatedAt'])
  sortBy?:
    | 'issuedAt'
    | 'amountTotal'
    | 'quoteNumber'
    | 'createdAt'
    | 'updatedAt';

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
