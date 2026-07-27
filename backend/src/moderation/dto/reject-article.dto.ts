import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comment!: string;
}
