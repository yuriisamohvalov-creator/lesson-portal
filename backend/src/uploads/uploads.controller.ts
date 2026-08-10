import { BadRequestException, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (_req, file, callback) => callback(
      ALLOWED_IMAGE_TYPES.has(file.mimetype) ? null : new BadRequestException('Invalid image format'),
      ALLOWED_IMAGE_TYPES.has(file.mimetype),
    ),
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.uploadsService.uploadImage(file, req.user.id);
  }

  @Get('images/:userId/:fileName')
  async getImage(@Param('userId') userId: string, @Param('fileName') fileName: string, @Res() response: Response) {
    response.redirect(await this.uploadsService.getImageUrl(userId, fileName));
  }
}
