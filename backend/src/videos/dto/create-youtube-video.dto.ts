import { IsString, IsUrl, MaxLength, Matches } from 'class-validator';

export class CreateYouTubeVideoDto {
  @IsString()
  @IsUrl()
  @MaxLength(500)
  @Matches(/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+/, {
    message: 'Invalid YouTube URL format',
  })
  youtubeUrl!: string;
}
