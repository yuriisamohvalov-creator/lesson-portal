import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AddArticleToCourseDto } from './dto/add-article.dto';
import { ReorderArticlesDto } from './dto/reorder-articles.dto';
import { ListCoursesDto } from './dto/list-courses.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAllPublic(@Query() dto: ListCoursesDto) {
    return this.coursesService.findAllPublic(dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.coursesService.findAllAdmin();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOnePublic(@Param('id') id: string, @Req() req: any) {
    const user = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    return this.coursesService.findOnePublic(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Req() req: any, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @Post(':id/articles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addArticle(
    @Param('id') courseId: string,
    @Body() dto: AddArticleToCourseDto,
  ) {
    return this.coursesService.addArticle(courseId, dto);
  }

  @Delete(':id/articles/:articleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  removeArticle(
    @Param('id') courseId: string,
    @Param('articleId') articleId: string,
  ) {
    return this.coursesService.removeArticle(courseId, articleId);
  }

  @Patch(':id/articles/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reorderArticles(
    @Param('id') courseId: string,
    @Body() dto: ReorderArticlesDto,
  ) {
    return this.coursesService.reorderArticles(courseId, dto);
  }
}
