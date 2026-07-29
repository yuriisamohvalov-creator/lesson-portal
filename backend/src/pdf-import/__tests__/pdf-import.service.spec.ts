import { BadRequestException } from '@nestjs/common';
import { PdfImportService } from '../pdf-import.service';

jest.mock('pdf-parse', () =>
  jest.fn(async (buffer: Buffer) => {
    const text = buffer.toString('utf8');
    if (text.includes('NO_TEXT')) {
      return { text: '   ', numpages: 1, info: {}, version: '1.0' };
    }
    return {
      text: 'Line one\n\nLine two',
      numpages: 2,
      info: { Title: '  Sample Title  ' },
      version: '1.7',
    };
  }),
);

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

  describe('extractTextFromPdf', () => {
    it('extracts text and suggested title', async () => {
      const result = await service.extractTextFromPdf(
        Buffer.from('%PDF-sample'),
      );
      expect(result.text).toContain('Line one');
      expect(result.suggestedTitle).toBe('Sample Title');
      expect(result.metadata?.pageCount).toBe(2);
    });

    it('throws when PDF has no extractable text', async () => {
      await expect(
        service.extractTextFromPdf(Buffer.from('%PDF-NO_TEXT')),
      ).rejects.toThrow('does not contain extractable text');
    });
  });
});
