import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ArticleOrderItem {
  @IsString()
  articleId!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class ReorderArticlesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleOrderItem)
  articles!: ArticleOrderItem[];
}
