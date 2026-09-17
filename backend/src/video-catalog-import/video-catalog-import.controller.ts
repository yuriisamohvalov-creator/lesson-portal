import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Req } from '@nestjs/common';
import { VideoCatalogImportService } from './video-catalog-import.service';
import { BrowseVideoCatalogDto } from './dto/browse-video-catalog.dto';
import { PreviewVideoCatalogDto } from './dto/preview-video-catalog.dto';
import { RunVideoCatalogImportDto } from './dto/run-video-catalog-import.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/video-catalog-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class VideoCatalogImportController {
  constructor(private readonly importService: VideoCatalogImportService) {}

  @Get('roots')
  @ApiOperation({ summary: 'List configured filesystem roots for video import' })
  getRoots() {
    return { roots: this.importService.getConfiguredRoots() };
  }

  @Get('browse')
  @ApiOperation({ summary: 'Browse directories under configured import roots' })
  browse(@Query() dto: BrowseVideoCatalogDto) {
    return this.importService.browseDirectory(dto.path);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview MP4/WebM files that would be imported' })
  preview(@Body() dto: PreviewVideoCatalogDto) {
    return this.importService.previewImport(dto.sourcePath, dto.recursive ?? true);
  }

  @Post('run')
  @ApiOperation({ summary: 'Start background import job from a catalog directory' })
  run(@Req() req: { user: { id: string } }, @Body() dto: RunVideoCatalogImportDto) {
    const job = this.importService.startImport(req.user.id, dto);
    return { jobId: job.id, status: job.status };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get video catalog import job status' })
  getJob(@Param('jobId') jobId: string) {
    return this.importService.getJob(jobId);
  }
}
