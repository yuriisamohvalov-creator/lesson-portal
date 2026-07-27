import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  content?: string;

  @IsString()
  categoryId!: string;
}
