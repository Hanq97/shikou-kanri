import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CloneQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  newName?: string;
}
