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
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  ListTasksQueryDto,
  AddTaskCommentDto,
} from './tasks.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @Permissions({ module: 'tasks', action: 'view' })
  list(@Query() query: ListTasksQueryDto) {
    return this.tasksService.list(query);
  }

  @Get('my')
  @Permissions({ module: 'tasks', action: 'view' })
  myTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.list({ ...query, assigned_to: user.userId });
  }

  @Get(':id')
  @Permissions({ module: 'tasks', action: 'view' })
  findById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Post()
  @Permissions({ module: 'tasks', action: 'create' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'tasks', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Post(':id/complete')
  @Permissions({ module: 'tasks', action: 'edit' })
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.complete(id, user.userId);
  }

  @Post(':id/comments')
  @Permissions({ module: 'tasks', action: 'edit' })
  addComment(
    @Param('id') id: string,
    @Body() dto: AddTaskCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.addComment(id, user.userId, dto.content);
  }

  @Get(':id/comments')
  @Permissions({ module: 'tasks', action: 'view' })
  listComments(@Param('id') id: string) {
    return this.tasksService.listComments(id);
  }
}
