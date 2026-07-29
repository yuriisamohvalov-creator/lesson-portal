import { Injectable, BadRequestException } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PdfImportService {
  async extractTextFromPdf(buffer: Buffer): Promise<{ text: string; metadata?: any }> {
    try {
      const data = await pdfParse(buffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new BadRequestException('PDF file contains no extractable text');
      }

      return {
        text: data.text,
        metadata: {
          info: data.info,
          pageCount: data.numpages,
          version: data.version,
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse PDF: ${error.message}`);
    }
  }

  convertTextToHtml(text: string): string {
    if (!text) return '';
    
    const lines = text.split('\n');
    const htmlLines: string[] = [];
    let inParagraph = false;
    let currentParagraph: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length === 0) {
        if (inParagraph && currentParagraph.length > 0) {
          htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
          inParagraph = false;
        }
        continue;
      }

      if (!inParagraph) {
        inParagraph = true;
      }
      
      currentParagraph.push(trimmedLine);
    }

    if (currentParagraph.length > 0) {
      htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
    }

    return htmlLines.join('\n');
  }
}
