import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions({ module: 'users', action: 'view' })
  list() {
    return this.usersService.list();
  }

  @Get(':id')
  @Permissions({ module: 'users', action: 'view' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Permissions({ module: 'users', action: 'create' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'users', action: 'edit' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(id, dto, user.userId);
  }

  @Patch(':id/password')
  @Permissions({ module: 'users', action: 'edit' })
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, dto);
  }

  @Delete(':id')
  @Permissions({ module: 'users', action: 'delete' })
  delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.delete(id, user.userId);
  }
}
