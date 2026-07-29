import { Injectable, BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';

export const PDF_MAGIC = '%PDF-';
export const DEFAULT_PDF_MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class PdfImportService {
  getMaxFileSizeBytes(): number {
    const mb = Number(process.env.PDF_IMPORT_MAX_MB || '20');
    if (!Number.isFinite(mb) || mb <= 0) {
      return DEFAULT_PDF_MAX_BYTES;
    }
    return mb * 1024 * 1024;
  }

  assertPdfBuffer(buffer: Buffer, maxBytes: number): void {
    if (!buffer?.length) {
      throw new BadRequestException('PDF file is empty');
    }
    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        `PDF file is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`,
      );
    }
    if (buffer.subarray(0, 5).toString('ascii') !== PDF_MAGIC) {
      throw new BadRequestException('File is not a valid PDF');
    }
  }

  escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async extractTextFromPdf(buffer: Buffer): Promise<{
    text: string;
    suggestedTitle?: string;
    metadata?: {
      pageCount: number;
      version?: string;
    };
  }> {
    const maxBytes = this.getMaxFileSizeBytes();
    this.assertPdfBuffer(buffer, maxBytes);

    try {
      const data = await pdfParse(buffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new BadRequestException(
          'PDF does not contain extractable text (scanned images are not supported)',
        );
      }

      const rawTitle = data.info?.Title;
      const suggestedTitle =
        typeof rawTitle === 'string' && rawTitle.trim().length > 0
          ? rawTitle.trim()
          : undefined;

      return {
        text: data.text,
        suggestedTitle,
        metadata: {
          pageCount: data.numpages,
          version: data.version,
        },
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown PDF parse error';
      throw new BadRequestException(`Failed to parse PDF: ${message}`);
    }
  }

  convertTextToHtml(text: string): string {
    if (!text) return '';

    const lines = text.split('\n');
    const htmlLines: string[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length === 0) return;
      htmlLines.push(
        `<p>${this.escapeHtml(currentParagraph.join(' '))}</p>`,
      );
      currentParagraph = [];
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        flushParagraph();
        continue;
      }
      currentParagraph.push(trimmedLine);
    }

    flushParagraph();
    return htmlLines.join('\n');
  }
}
