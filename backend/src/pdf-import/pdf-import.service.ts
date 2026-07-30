import { Injectable, BadRequestException } from '@nestjs/common';
import { resolve } from 'path';

// pdfjs-dist публикует ESM-only сборку; используем динамический импорт,
// чтобы корректно работать и в CommonJS-среде NestJS, и в Jest.
const loadPdfJs = async () => {
  const mod: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return mod;
};

import type {
  TextItem,
  TextMarkedContent,
  TextContent,
  TextStyle,
} from 'pdfjs-dist/types/src/display/api';

export const PDF_MAGIC = '%PDF-';
export const DEFAULT_PDF_MAX_BYTES = 20 * 1024 * 1024;

interface ExtractedItem {
  str: string;
  fontName: string;
  x: number;
  y: number;
  fontSize: number;
  hasEOL: boolean;
}

@Injectable()
export class PdfImportService {
  private ensurePdfJsWorker(pdfjs: any): void {
    if (typeof pdfjs.GlobalWorkerOptions === 'undefined') {
      return;
    }
    const worker = pdfjs.GlobalWorkerOptions;
    if (!worker.workerSrc) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfjsPackage = require.resolve('pdfjs-dist/package.json');
        const baseDir = resolve(pdfjsPackage, '..');
        worker.workerSrc =
          'file://' + resolve(baseDir, 'legacy', 'build', 'pdf.worker.mjs');
      } catch {
        const baseDir = resolve(__dirname, '..', '..', 'node_modules', 'pdfjs-dist');
        worker.workerSrc =
          'file://' + resolve(baseDir, 'legacy', 'build', 'pdf.worker.mjs');
      }
    }
  }

  private getStandardFontDataUrl(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfjsPackage = require.resolve('pdfjs-dist/package.json');
      return resolve(pdfjsPackage, '..', 'standard_fonts') + '/';
    } catch {
      return (
        resolve(__dirname, '..', '..', 'node_modules', 'pdfjs-dist', 'standard_fonts') +
        '/'
      );
    }
  }

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

  private isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
    return 'str' in item;
  }

  async extractTextFromPdf(buffer: Buffer): Promise<{
    text: string;
    html: string;
    suggestedTitle?: string;
    metadata?: {
      pageCount: number;
      version?: string;
    };
  }> {
    const maxBytes = this.getMaxFileSizeBytes();
    this.assertPdfBuffer(buffer, maxBytes);

    try {
      const pdfjs = await loadPdfJs();
      this.ensurePdfJsWorker(pdfjs);
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        standardFontDataUrl: this.getStandardFontDataUrl(),
        verbosity: 0,
      });
      const doc = await loadingTask.promise;

      const allItems: ExtractedItem[] = [];
      const allStyles: Record<string, TextStyle> = {};

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content: TextContent = await page.getTextContent({
          includeMarkedContent: false,
        });
        Object.assign(allStyles, content.styles);
        for (const raw of content.items) {
          if (!this.isTextItem(raw)) continue;
          const transform = raw.transform as number[];
          allItems.push({
            str: raw.str,
            fontName: raw.fontName,
            x: transform[4] ?? 0,
            y: transform[5] ?? 0,
            fontSize: transform[0] ?? 12,
            hasEOL: raw.hasEOL,
          });
        }
      }

      const html = this.convertItemsToHtml(allItems, allStyles);
      const text = this.extractPlainText(allItems);

      if (!text.trim()) {
        throw new BadRequestException(
          'PDF does not contain extractable text (scanned images are not supported)',
        );
      }

      const info = await doc.getMetadata().catch(() => null);
      const rawTitle =
        info && 'info' in info && info.info && (info.info as any).Title;
      const suggestedTitle =
        typeof rawTitle === 'string' && rawTitle.trim().length > 0
          ? rawTitle.trim()
          : undefined;

      return {
        text,
        html,
        suggestedTitle,
        metadata: {
          pageCount: doc.numPages,
          version: pdfjs.version,
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

  private extractPlainText(items: ExtractedItem[]): string {
    const sorted = [...items].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 2) return yDiff;
      return a.x - b.x;
    });

    const avgFontSize =
      sorted.reduce((sum, item) => sum + item.fontSize, 0) / sorted.length || 12;
    const spaceThreshold = avgFontSize * 0.25;

    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;
    let lastX: number | null = null;
    const yThreshold = 2;

    for (const item of sorted) {
      if (lastY !== null && Math.abs(item.y - lastY) > yThreshold) {
        lines.push(currentLine.trim());
        currentLine = '';
        lastX = null;
      }

      if (
        lastX !== null &&
        item.x - lastX > spaceThreshold &&
        !currentLine.endsWith(' ') &&
        !item.str.startsWith(' ')
      ) {
        currentLine += ' ';
      }

      currentLine += item.str;
      lastX = item.x;

      if (item.hasEOL) {
        lines.push(currentLine.trim());
        currentLine = '';
        lastY = null;
        lastX = null;
        continue;
      }
      lastY = item.y;
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    return lines.join('\n');
  }

  private detectFontStyle(
    fontName: string,
    style: TextStyle | undefined,
  ): { bold: boolean; italic: boolean } {
    const family = style?.fontFamily?.toLowerCase() ?? '';
    const name = fontName.toLowerCase();
    const source = `${family} ${name}`;
    return {
      bold: /bold|black|heavy|extra\s*bold/i.test(source),
      italic: /italic|oblique/i.test(source),
    };
  }

  private buildInlineHtml(
    lineItems: ExtractedItem[],
    styles: Record<string, TextStyle>,
  ): string {
    if (lineItems.length === 0) return '';

    const sorted = [...lineItems].sort((a, b) => a.x - b.x);
    const avgFontSize =
      sorted.reduce((sum, item) => sum + item.fontSize, 0) / sorted.length || 12;
    const spaceThreshold = avgFontSize * 0.25;

    let html = '';
    let currentBold = false;
    let currentItalic = false;
    let buffer = '';

    const flush = () => {
      if (buffer === '') return;
      let text = this.escapeHtml(buffer);
      if (currentBold) text = `<strong>${text}</strong>`;
      if (currentItalic) text = `<em>${text}</em>`;
      html += text;
      buffer = '';
    };

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const { bold, italic } = this.detectFontStyle(
        item.fontName,
        styles[item.fontName],
      );
      if (bold !== currentBold || italic !== currentItalic) {
        flush();
        currentBold = bold;
        currentItalic = italic;
      }

      // Insert a space if the gap between this item and the previous one
      // is large enough to be a word break.
      if (i > 0) {
        const prev = sorted[i - 1];
        const gap = item.x - prev.x;
        if (
          gap > spaceThreshold &&
          !buffer.endsWith(' ') &&
          !item.str.startsWith(' ')
        ) {
          buffer += ' ';
        }
      }

      buffer += item.str;
    }
    flush();
    return html;
  }

  private buildParagraphHtml(
    paraItems: ExtractedItem[],
    styles: Record<string, TextStyle>,
  ): string {
    const sorted = [...paraItems].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 1.5) return yDiff;
      return a.x - b.x;
    });

    const lines: ExtractedItem[][] = [];
    let currentLine: ExtractedItem[] = [];
    let lastY: number | null = null;
    const yThreshold = 1.5;

    for (const item of sorted) {
      if (lastY !== null && Math.abs(item.y - lastY) > yThreshold) {
        lines.push(currentLine);
        currentLine = [];
      }
      currentLine.push(item);
      lastY = item.y;
    }
    if (currentLine.length) lines.push(currentLine);

    const lineHtmls = lines.map((line) => {
      const ordered = [...line].sort((a, b) => a.x - b.x);
      return this.buildInlineHtml(ordered, styles);
    });

    return lineHtmls.join('<br>\n');
  }

  convertItemsToHtml(
    items: ExtractedItem[],
    styles: Record<string, TextStyle>,
  ): string {
    if (!items.length) return '';

    const sorted = [...items].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 2) return yDiff;
      return a.x - b.x;
    });

    const paragraphs: ExtractedItem[][] = [];
    let current: ExtractedItem[] = [];
    let prevY: number | null = null;
    const paraThreshold = 4;

    for (const item of sorted) {
      if (prevY !== null && Math.abs(item.y - prevY) > paraThreshold) {
        if (current.length) paragraphs.push(current);
        current = [];
      }
      current.push(item);
      prevY = item.y;
    }
    if (current.length) paragraphs.push(current);

    const htmlParts = paragraphs.map((para) => {
      const inner = this.buildParagraphHtml(para, styles);
      return `<p>${inner}</p>`;
    });
    return htmlParts.join('\n');
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
