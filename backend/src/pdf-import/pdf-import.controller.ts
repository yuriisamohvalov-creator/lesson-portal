import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PdfImportService } from './pdf-import.service';

@Controller('pdf-import')
export class PdfImportController {
  constructor(private readonly pdfImportService: PdfImportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: Number(process.env.PDF_IMPORT_MAX_MB || '20') * 1024 * 1024,
      },
    }),
  )
  async importPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No PDF file uploaded');
    }

    if (
      file.mimetype !== 'application/pdf' &&
      !file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      throw new BadRequestException('File must be a PDF');
    }

    const result = await this.pdfImportService.extractTextFromPdf(file.buffer);
    const htmlContent = this.pdfImportService.convertTextToHtml(result.text);

    return {
      text: result.text,
      html: htmlContent,
      suggestedTitle: result.suggestedTitle,
      metadata: result.metadata,
    };
  }
}
