import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export type SavedSearchScope = 'projects' | 'customers';

const SCOPES: SavedSearchScope[] = ['projects', 'customers'];

export class CreateSavedSearchDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEnum(SCOPES)
  scope!: SavedSearchScope;

  @IsObject()
  filterJson!: Record<string, unknown>;
}

export class ListSavedSearchesQueryDto {
  @IsOptional()
  @IsEnum(SCOPES)
  scope?: SavedSearchScope;
}
