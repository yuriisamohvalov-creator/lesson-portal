import { Module } from '@nestjs/common';
import { PdfImportController } from './pdf-import.controller';
import { PdfImportService } from './pdf-import.service';

@Module({
  controllers: [PdfImportController],
  providers: [PdfImportService],
  exports: [PdfImportService],
})
export class PdfImportModule {}
