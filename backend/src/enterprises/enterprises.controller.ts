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
import { EnterprisesService } from './enterprises.service';
import { CreateEnterpriseDto, UpdateEnterpriseDto } from './enterprises.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Enterprises')
@ApiBearerAuth()
@Controller('enterprises')
export class EnterprisesController {
  constructor(private enterprisesService: EnterprisesService) {}

  @Get()
  @Permissions({ module: 'units', action: 'view' })
  list(@Query('search') search?: string) {
    return this.enterprisesService.list(search);
  }

  @Get(':id')
  @Permissions({ module: 'units', action: 'view' })
  findById(@Param('id') id: string) {
    return this.enterprisesService.findById(id);
  }

  @Post()
  @Permissions({ module: 'units', action: 'create' })
  create(
    @Body() dto: CreateEnterpriseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.enterprisesService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'units', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateEnterpriseDto) {
    return this.enterprisesService.update(id, dto);
  }
}
