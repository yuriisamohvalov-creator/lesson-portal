import { IsString, IsInt, Min } from 'class-validator';

export class AddArticleToCourseDto {
  @IsString()
  articleId!: string;

  @IsInt()
  @Min(1)
  order!: number;
}
