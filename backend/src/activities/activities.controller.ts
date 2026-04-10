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
import { ActivitiesService } from './activities.service';
import {
  CreateActivityDto,
  UpdateActivityDto,
  ListActivitiesQueryDto,
} from './activities.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Get()
  @Permissions({ module: 'activities', action: 'view' })
  list(@Query() query: ListActivitiesQueryDto) {
    return this.activitiesService.list(query);
  }

  @Get('my')
  @Permissions({ module: 'activities', action: 'view' })
  myActivities(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListActivitiesQueryDto,
  ) {
    return this.activitiesService.list({ ...query, assigned_to: user.userId });
  }

  @Get(':id')
  @Permissions({ module: 'activities', action: 'view' })
  findById(@Param('id') id: string) {
    return this.activitiesService.findById(id);
  }

  @Post()
  @Permissions({ module: 'activities', action: 'create' })
  create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.activitiesService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'activities', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, dto);
  }
}
