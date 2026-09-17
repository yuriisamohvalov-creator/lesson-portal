import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { readdir, stat, unlink } from 'fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'path';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  ArticleStatus,
  ModerationAction,
  VideoType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VideosService } from '../videos/videos.service';
import { VideoThumbnailService } from '../videos/video-thumbnail.service';
import { CoursesService } from '../courses/courses.service';
import { CacheService } from '../cache/cache.service';
import { RunVideoCatalogImportDto } from './dto/run-video-catalog-import.dto';

const VIDEO_EXT = new Set(['.mp4', '.webm']);

export type CatalogBrowseEntry = {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  sizeBytes?: number;
};

export type CatalogPreviewFile = {
  name: string;
  path: string;
  sizeBytes: number;
};

export type ImportJobItemResult = {
  filePath: string;
  title: string;
  articleId?: string;
  videoId?: string;
  error?: string;
};

export type ImportJobState = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  total: number;
  processed: number;
  sourcePath: string;
  results: ImportJobItemResult[];
  error?: string;
};

@Injectable()
export class VideoCatalogImportService {
  private readonly logger = new Logger(VideoCatalogImportService.name);
  private readonly jobs = new Map<string, ImportJobState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly videosService: VideosService,
    private readonly thumbnails: VideoThumbnailService,
    private readonly coursesService: CoursesService,
    private readonly cache: CacheService,
  ) {}

  getConfiguredRoots(): string[] {
    const raw = process.env.VIDEO_CATALOG_IMPORT_ROOTS || '';
    return raw
      .split(/[:;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((root) => resolve(root));
  }

  assertRootsConfigured(): string[] {
    const roots = this.getConfiguredRoots();
    if (roots.length === 0) {
      throw new BadRequestException(
        'VIDEO_CATALOG_IMPORT_ROOTS is not configured on the server',
      );
    }
    return roots;
  }

  resolveAllowedPath(requestedPath: string): string {
    const roots = this.assertRootsConfigured();
    const normalized = resolve(requestedPath);
    for (const root of roots) {
      if (normalized === root || normalized.startsWith(root + sep)) {
        return normalized;
      }
    }
    throw new BadRequestException('Path is outside allowed import roots');
  }

  async browseDirectory(requestedPath?: string): Promise<{
    roots: string[];
    currentPath: string;
    parentPath: string | null;
    entries: CatalogBrowseEntry[];
    videoFileCount: number;
  }> {
    const roots = this.assertRootsConfigured();
    const currentPath = requestedPath
      ? this.resolveAllowedPath(requestedPath)
      : roots[0];

    let dirStat;
    try {
      dirStat = await stat(currentPath);
    } catch {
      throw new NotFoundException('Directory not found');
    }
    if (!dirStat.isDirectory()) {
      throw new BadRequestException('Path is not a directory');
    }

    const parentPath =
      roots.some((root) => currentPath === root)
        ? null
        : (() => {
            const parent = resolve(currentPath, '..');
            try {
              this.resolveAllowedPath(parent);
              return parent;
            } catch {
              return roots.find((root) => currentPath.startsWith(root + sep)) || null;
            }
          })();

    const names = await readdir(currentPath);
    const entries: CatalogBrowseEntry[] = [];
    let videoFileCount = 0;

    for (const name of names.sort((a, b) => a.localeCompare(b, 'ru'))) {
      const fullPath = join(currentPath, name);
      try {
        const entryStat = await stat(fullPath);
        if (entryStat.isDirectory()) {
          entries.push({ name, path: fullPath, kind: 'directory' });
        } else if (entryStat.isFile() && VIDEO_EXT.has(extname(name).toLowerCase())) {
          videoFileCount += 1;
          entries.push({
            name,
            path: fullPath,
            kind: 'file',
            sizeBytes: entryStat.size,
          });
        }
      } catch {
        // skip unreadable entries
      }
    }

    return {
      roots,
      currentPath,
      parentPath,
      entries,
      videoFileCount,
    };
  }

  async previewImport(sourcePath: string, recursive: boolean): Promise<{
    sourcePath: string;
    recursive: boolean;
    files: CatalogPreviewFile[];
  }> {
    const resolved = this.resolveAllowedPath(sourcePath);
    const dirStat = await stat(resolved);
    if (!dirStat.isDirectory()) {
      throw new BadRequestException('Source path must be a directory');
    }

    const files = await this.collectVideoFiles(resolved, recursive);
    return { sourcePath: resolved, recursive, files };
  }

  private async collectVideoFiles(
    dirPath: string,
    recursive: boolean,
  ): Promise<CatalogPreviewFile[]> {
    const files: CatalogPreviewFile[] = [];

    const walk = async (current: string) => {
      const names = await readdir(current);
      for (const name of names) {
        const fullPath = join(current, name);
        const entryStat = await stat(fullPath);
        if (entryStat.isDirectory()) {
          if (recursive) {
            await walk(fullPath);
          }
          continue;
        }
        if (!entryStat.isFile()) continue;
        if (!VIDEO_EXT.has(extname(name).toLowerCase())) continue;
        files.push({
          name,
          path: fullPath,
          sizeBytes: entryStat.size,
        });
      }
    };

    await walk(dirPath);
    files.sort((a, b) => a.path.localeCompare(b.path, 'ru'));
    return files;
  }

  titleFromFileName(fileName: string): string {
    const base = basename(fileName, extname(fileName));
    return base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Видеоурок';
  }

  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || 'video-lesson';
  }

  private async ensureUniqueSlug(slug: string): Promise<string> {
    let candidate = slug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.article.findFirst({
        where: { slug: candidate },
      });
      if (!existing) return candidate;
      counter += 1;
      candidate = `${slug}-${counter}`;
    }
  }

  startImport(adminUserId: string, dto: RunVideoCatalogImportDto): ImportJobState {
    const jobId = randomUUID();
    const job: ImportJobState = {
      id: jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      total: 0,
      processed: 0,
      sourcePath: dto.sourcePath,
      results: [],
    };
    this.jobs.set(jobId, job);

    setImmediate(() => {
      void this.runImportJob(adminUserId, jobId, dto).catch((err) => {
        const failed = this.jobs.get(jobId);
        if (!failed) return;
        failed.status = 'failed';
        failed.finishedAt = new Date().toISOString();
        failed.error = err instanceof Error ? err.message : String(err);
        this.logger.error(`Import job ${jobId} failed`, err);
      });
    });

    return job;
  }

  getJob(jobId: string): ImportJobState {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  private async runImportJob(
    adminUserId: string,
    jobId: string,
    dto: RunVideoCatalogImportDto,
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date().toISOString();

    const sourcePath = this.resolveAllowedPath(dto.sourcePath);
    const files = await this.collectVideoFiles(sourcePath, dto.recursive ?? true);
    job.total = files.length;

    if (files.length === 0) {
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
      return;
    }

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let courseId = dto.courseId;
    if (dto.createCourse) {
      if (!dto.courseName?.trim() || !dto.courseSlug?.trim()) {
        throw new BadRequestException(
          'courseName and courseSlug are required when createCourse is true',
        );
      }
      const course = await this.coursesService.create(adminUserId, {
        name: dto.courseName.trim(),
        slug: dto.courseSlug.trim(),
        description: dto.courseDescription?.trim(),
        status: dto.publishCourse === false ? 'draft' : 'published',
      });
      courseId = course.id;
    }

    if (courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
    }

    let courseOrderOffset = 0;
    if (courseId) {
      const agg = await this.prisma.courseArticle.aggregate({
        where: { courseId },
        _max: { order: true },
      });
      courseOrderOffset = agg._max.order ?? 0;
    }

    const roots = this.assertRootsConfigured();
    const rootForRelative =
      roots.find((root) => sourcePath === root || sourcePath.startsWith(root + sep)) ||
      sourcePath;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const title = this.titleFromFileName(file.name);
      const item: ImportJobItemResult = { filePath: file.path, title };
      job.results.push(item);

      try {
        const slug = await this.ensureUniqueSlug(this.generateSlug(title));
        const rel = relative(rootForRelative, file.path);
        const content = `<p>Видеоурок из каталога <code>${this.escapeHtml(rel)}</code>.</p>`;

        const article = await this.prisma.article.create({
          data: {
            title,
            slug,
            content,
            authorId: adminUserId,
            categoryId: dto.categoryId,
            status: ArticleStatus.DRAFT,
          },
        });

        const video = await this.uploadLocalVideo(article.id, file.path, file.name);
        const thumbnailKey = await this.thumbnails.generateAndStore(
          video.id,
          article.id,
          video.s3Key!,
        );
        if (thumbnailKey) {
          await this.prisma.video.update({
            where: { id: video.id },
            data: { thumbnailKey },
          });
        }

        if (dto.publishArticles !== false) {
          await this.prisma.$transaction([
            this.prisma.article.update({
              where: { id: article.id },
              data: {
                status: ArticleStatus.PUBLISHED,
                publishedAt: new Date(),
                rejectionReason: null,
              },
            }),
            this.prisma.moderationLog.create({
              data: {
                articleId: article.id,
                moderatorId: adminUserId,
                action: ModerationAction.APPROVE,
                comment: 'Auto-published from video catalog import',
              },
            }),
          ]);
        }

        if (courseId) {
          await this.coursesService.addArticle(courseId, {
            articleId: article.id,
            order: courseOrderOffset + index + 1,
          });
        }

        await this.removeSourceFileAfterSuccessfulImport(file.path);

        item.articleId = article.id;
        item.videoId = video.id;
      } catch (err) {
        item.error = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to import ${file.path}: ${item.error}`);
      }

      job.processed = index + 1;
    }

    await this.cache.invalidatePattern('articles:list:*');
    await this.cache.del('categories:all');
    await this.cache.invalidatePattern('courses:list:*');

    job.status = 'completed';
    job.finishedAt = new Date().toISOString();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private async uploadLocalVideo(
    articleId: string,
    localPath: string,
    originalName: string,
  ) {
    const ext = extname(originalName).toLowerCase();
    if (!VIDEO_EXT.has(ext)) {
      throw new BadRequestException('Only .mp4 and .webm files are allowed');
    }

    const fileStat = await stat(localPath);
    const key = `uploads/${articleId}/${randomUUID()}${ext}`;
    const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';
    const s3 = this.videosService.getS3Client();
    const bucket = this.videosService.getBucket();

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: createReadStream(localPath),
        ContentType: contentType,
        ContentLength: fileStat.size,
      }),
    );

    return this.prisma.video.create({
      data: {
        articleId,
        type: VideoType.UPLOADED,
        s3Key: key,
        s3Bucket: bucket,
        processStatus: 'ready',
      },
    });
  }

  /** Deletes local catalog file only after full per-file import success. */
  private async removeSourceFileAfterSuccessfulImport(localPath: string): Promise<void> {
    const safePath = this.resolveAllowedPath(localPath);
    const ext = extname(safePath).toLowerCase();
    if (!VIDEO_EXT.has(ext)) {
      this.logger.warn(`Skip delete: not a catalog video file ${safePath}`);
      return;
    }
    try {
      const fileStat = await stat(safePath);
      if (!fileStat.isFile()) {
        return;
      }
      await unlink(safePath);
      this.logger.log(`Removed imported source file ${safePath}`);
    } catch (err) {
      this.logger.warn(
        `Could not remove source file ${safePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
