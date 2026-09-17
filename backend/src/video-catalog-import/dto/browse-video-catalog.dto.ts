import { IsOptional, IsString } from 'class-validator';

export class BrowseVideoCatalogDto {
  @IsOptional()
  @IsString()
  path?: string;
}
