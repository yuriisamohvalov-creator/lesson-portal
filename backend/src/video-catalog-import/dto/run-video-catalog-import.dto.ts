import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RunVideoCatalogImportDto {
  @IsString()
  sourcePath!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsBoolean()
  recursive?: boolean;

  @IsOptional()
  @IsBoolean()
  publishArticles?: boolean;

  @IsOptional()
  @IsBoolean()
  createCourse?: boolean;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  courseName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courseSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  courseDescription?: string;

  @IsOptional()
  @IsBoolean()
  publishCourse?: boolean;
}
