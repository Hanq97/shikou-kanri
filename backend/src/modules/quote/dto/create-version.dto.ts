import { IsString, Length } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @Length(5, 1000)
  changeReason!: string;
}
