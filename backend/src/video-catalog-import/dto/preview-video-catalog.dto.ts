import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PreviewVideoCatalogDto {
  @IsString()
  sourcePath!: string;

  @IsOptional()
  @IsBoolean()
  recursive?: boolean;
}
