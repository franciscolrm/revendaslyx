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
import { ProcessesService } from './processes.service';
import {
  CreateProcessDto,
  UpdateProcessDto,
  ListProcessesQueryDto,
  AdvanceStageDto,
  RevertStageDto,
  AddCommentDto,
} from './processes.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Processes')
@ApiBearerAuth()
@Controller('processes')
export class ProcessesController {
  constructor(private processesService: ProcessesService) {}

  @Get()
  @Permissions({ module: 'processes', action: 'view' })
  list(
    @Query() query: ListProcessesQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.processesService.list(user.userId, query);
  }

  @Get('flow-types')
  @Permissions({ module: 'processes', action: 'view' })
  listFlowTypes() {
    return this.processesService.listFlowTypes();
  }

  @Get(':id')
  @Permissions({ module: 'processes', action: 'view' })
  findById(@Param('id') id: string) {
    return this.processesService.findById(id);
  }

  @Post()
  @Permissions({ module: 'processes', action: 'create' })
  create(
    @Body() dto: CreateProcessDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.processesService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'processes', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateProcessDto) {
    return this.processesService.update(id, dto);
  }

  @Post(':id/advance')
  @Permissions({ module: 'processes', action: 'edit' })
  advanceStage(
    @Param('id') id: string,
    @Body() dto: AdvanceStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.processesService.advanceStage(id, user.userId, dto.notes);
  }

  @Post(':id/revert')
  @Permissions({ module: 'processes', action: 'edit' })
  revertStage(
    @Param('id') id: string,
    @Body() dto: RevertStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.processesService.revertStage(id, user.userId, dto.reason);
  }

  @Post(':id/comments')
  @Permissions({ module: 'processes', action: 'edit' })
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.processesService.addComment(id, user.userId, dto.content, dto.is_internal);
  }

  @Get(':id/comments')
  @Permissions({ module: 'processes', action: 'view' })
  listComments(@Param('id') id: string) {
    return this.processesService.listComments(id);
  }

  @Get(':id/timeline')
  @Permissions({ module: 'processes', action: 'view' })
  getTimeline(@Param('id') id: string) {
    return this.processesService.getTimeline(id);
  }
}
