import {
  Controller,
  Get,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  listUsers(@Query() dto: ListUsersDto) {
    return this.usersService.listUsers(dto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  changeRole(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.usersService.changeRole(req.user.id, targetUserId, dto);
  }

  @Patch(':id/block')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  blockUser(@Param('id') targetUserId: string) {
    return this.usersService.blockUser(targetUserId);
  }

  @Patch(':id/unblock')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  unblockUser(@Param('id') targetUserId: string) {
    return this.usersService.unblockUser(targetUserId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  deleteUser(@Req() req: any, @Param('id') targetUserId: string) {
    return this.usersService.deleteUser(req.user.id, targetUserId);
  }
}
