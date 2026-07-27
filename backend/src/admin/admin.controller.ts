import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminArticlesDto } from './dto/admin-articles.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Returns platform statistics' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('articles')
  @ApiOperation({ summary: 'Get all articles (admin view)' })
  @ApiResponse({ status: 200, description: 'Returns paginated articles' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  getAllArticles(@Query() dto: AdminArticlesDto) {
    return this.adminService.getAllArticles(dto);
  }
}
