import { IsString, IsInt, Min, Max, Matches, IsOptional } from 'class-validator';

export class UploadVideoUrlDto {
  @IsString()
  @Matches(/\.(mp4|webm)$/i, {
    message: 'Only .mp4 and .webm files are allowed',
  })
  fileName!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  fileSize!: number;

  @IsOptional()
  @IsString()
  contentType?: string;
}
