import { IsString, Length } from 'class-validator';

export class DeleteQuoteDto {
  @IsString()
  @Length(5, 1000)
  reason!: string;
}
