import { BadRequestException } from '@nestjs/common';
import { PdfImportService } from '../pdf-import.service';

describe('PdfImportService', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService();
  });

  describe('assertPdfBuffer', () => {
    it('rejects empty buffer', () => {
      expect(() => service.assertPdfBuffer(Buffer.alloc(0), 1024)).toThrow(
        BadRequestException,
      );
    });

    it('rejects non-PDF magic bytes', () => {
      expect(() =>
        service.assertPdfBuffer(Buffer.from('NOTPDF'), 1024),
      ).toThrow('File is not a valid PDF');
    });

    it('rejects oversized buffer', () => {
      const buf = Buffer.from('%PDF-test');
      expect(() => service.assertPdfBuffer(buf, 4)).toThrow('too large');
    });
  });

  describe('convertTextToHtml', () => {
    it('wraps paragraphs and escapes HTML', () => {
      const html = service.convertTextToHtml('Hello <b>world</b>\n\nSecond line');
      expect(html).toBe(
        '<p>Hello &lt;b&gt;world&lt;/b&gt;</p>\n<p>Second line</p>',
      );
    });

    it('returns empty string for empty input', () => {
      expect(service.convertTextToHtml('')).toBe('');
    });
  });

  describe('convertItemsToHtml', () => {
    it('wraps items in paragraphs and applies inline formatting', () => {
      const html = service.convertItemsToHtml(
        [
          { str: 'Hello', x: 0, y: 20, fontSize: 12, fontName: 'f1', hasEOL: false },
          { str: 'World', x: 40, y: 20, fontSize: 12, fontName: 'f2', hasEOL: false },
          { str: 'Next', x: 0, y: 0, fontSize: 12, fontName: 'f1', hasEOL: false },
        ],
        {
          f1: {
            fontFamily: 'sans-serif',
            ascent: 0.7,
            descent: -0.2,
            vertical: false,
          },
          f2: {
            fontFamily: 'sans-serif bold',
            ascent: 0.7,
            descent: -0.2,
            vertical: false,
          },
        },
      );
      expect(html).toContain('<p>Hello<strong> World</strong></p>');
      expect(html).toContain('<p>Next</p>');
    });

    it('returns empty string for empty input', () => {
      expect(service.convertItemsToHtml([], {})).toBe('');
    });
  });

  describe('extractTextFromPdf', () => {
    it('throws for invalid PDF structure', async () => {
      await expect(
        service.extractTextFromPdf(Buffer.from('%PDF-sample')),
      ).rejects.toThrow('Failed to parse PDF');
    });
  });
});
