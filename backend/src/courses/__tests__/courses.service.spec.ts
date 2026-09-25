import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: {
    course: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    invalidatePattern: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      course: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('findAllPublic', () => {
    it('filters by trimmed search across name and description (case-insensitive)', async () => {
      await service.findAllPublic({
        page: 1,
        limit: 15,
        search: '  Algebra  ',
      });

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'published',
            OR: [
              { name: { contains: 'Algebra', mode: 'insensitive' } },
              { description: { contains: 'Algebra', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(prisma.course.count).toHaveBeenCalledWith({
        where: {
          status: 'published',
          OR: [
            { name: { contains: 'Algebra', mode: 'insensitive' } },
            { description: { contains: 'Algebra', mode: 'insensitive' } },
          ],
        },
      });
    });
  });
});
