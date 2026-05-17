import { IsString, Length } from 'class-validator';

export class RejectDto {
  @IsString()
  @Length(5, 1000)
  reason!: string;
}
