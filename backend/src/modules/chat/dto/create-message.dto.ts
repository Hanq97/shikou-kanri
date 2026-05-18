import { Type } from 'class-transformer';
import {
  IsArray,
  IsBase64,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatAttachmentDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @IsBase64()
  dataBase64!: string;
}

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}
