import { BadRequestException } from '@nestjs/common';
import {
  VideoCatalogImportService,
  catalogImportSlugMatches,
} from '../video-catalog-import.service';

describe('VideoCatalogImportService', () => {
  const originalRoots = process.env.VIDEO_CATALOG_IMPORT_ROOTS;

  afterEach(() => {
    if (originalRoots === undefined) {
      delete process.env.VIDEO_CATALOG_IMPORT_ROOTS;
    } else {
      process.env.VIDEO_CATALOG_IMPORT_ROOTS = originalRoots;
    }
  });

  function createService() {
    return new VideoCatalogImportService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('titleFromFileName decodes underscores and extension', () => {
    process.env.VIDEO_CATALOG_IMPORT_ROOTS = '/data/import';
    const service = createService();
    expect(service.titleFromFileName('01_Стойка_лучника.mp4')).toBe(
      '01 Стойка лучника',
    );
  });

  it('resolveAllowedPath rejects paths outside roots', () => {
    process.env.VIDEO_CATALOG_IMPORT_ROOTS = '/data/import';
    const service = createService();
    expect(() => service.resolveAllowedPath('/etc/passwd')).toThrow(
      BadRequestException,
    );
  });

  it('resolveAllowedPath accepts nested path under root', () => {
    process.env.VIDEO_CATALOG_IMPORT_ROOTS = '/data/import';
    const service = createService();
    expect(service.resolveAllowedPath('/data/import/course-1')).toBe(
      '/data/import/course-1',
    );
  });

  it('catalogImportSlugMatches base slug and numbered suffix only', () => {
    expect(catalogImportSlugMatches('openclaw-guide', 'openclaw-guide')).toBe(
      true,
    );
    expect(catalogImportSlugMatches('openclaw-guide-2', 'openclaw-guide')).toBe(
      true,
    );
    expect(
      catalogImportSlugMatches('openclaw-guide-extra', 'openclaw-guide'),
    ).toBe(false);
  });
});
