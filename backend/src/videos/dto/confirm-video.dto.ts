import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ConfirmVideoDto {
  @IsString()
  @MaxLength(500)
  s3Key!: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}
