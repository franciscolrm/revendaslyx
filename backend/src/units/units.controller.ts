import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto, ListUnitsQueryDto } from './units.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Get()
  @Permissions({ module: 'units', action: 'view' })
  list(@Query() query: ListUnitsQueryDto) {
    return this.unitsService.list(query);
  }

  @Get('summary')
  @Permissions({ module: 'units', action: 'view' })
  getSummary(@Query('import_batch_ids') importBatchIds?: string) {
    const ids = importBatchIds ? importBatchIds.split(',').filter(Boolean) : undefined;
    return this.unitsService.getSummary(ids);
  }

  @Get(':id')
  @Permissions({ module: 'units', action: 'view' })
  findById(@Param('id') id: string) {
    return this.unitsService.findById(id);
  }

  @Post()
  @Permissions({ module: 'units', action: 'create' })
  create(
    @Body() dto: CreateUnitDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.unitsService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'units', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions({ module: 'units', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
