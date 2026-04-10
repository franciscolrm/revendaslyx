import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResalesService } from './resales.service';
import {
  CreateResaleDto,
  UpdateResaleDto,
  ChangeStatusDto,
  AddInteractionDto,
  ListResalesQueryDto,
} from './resales.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Resales')
@ApiBearerAuth()
@Controller('resales')
export class ResalesController {
  constructor(private resalesService: ResalesService) {}

  @Get()
  @Permissions({ module: 'resales', action: 'view' })
  list(
    @Query() query: ListResalesQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.resalesService.list(user.userId, query);
  }

  @Get(':id')
  @Permissions({ module: 'resales', action: 'view' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.resalesService.findById(user.userId, id);
  }

  @Post()
  @Permissions({ module: 'resales', action: 'create' })
  create(@Body() dto: CreateResaleDto) {
    return this.resalesService.create(dto);
  }

  @Patch(':id')
  @Permissions({ module: 'resales', action: 'edit' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResaleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.resalesService.update(user.userId, id, dto);
  }

  @Post(':id/change-status')
  @Permissions({ module: 'resales', action: 'edit' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.resalesService.changeStatus(
      user.userId,
      id,
      dto.status_code,
      dto.notes,
    );
  }

  @Post(':id/interactions')
  @Permissions({ module: 'resales', action: 'edit' })
  addInteraction(
    @Param('id') id: string,
    @Body() dto: AddInteractionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.resalesService.addInteraction(
      user.userId,
      id,
      dto.interaction_type,
      dto.result,
      dto.notes,
    );
  }
}
