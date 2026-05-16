import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePropertyDto } from './create-property.dto';

/** Update property — same as create minus `customerId` (cannot reassign). */
export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['customerId'] as const),
) {}
