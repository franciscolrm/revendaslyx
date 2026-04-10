import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { UpsertFinancialValueDto } from './financial.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Financial')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
  constructor(private financialService: FinancialService) {}

  @Get('components')
  @Permissions({ module: 'financial', action: 'view' })
  getComponents() {
    return this.financialService.getComponents();
  }

  @Get('resale/:resaleId')
  @Permissions({ module: 'financial', action: 'view' })
  getByResale(
    @Param('resaleId') resaleId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.financialService.getByResale(user.userId, resaleId);
  }

  @Post('values')
  @Permissions({ module: 'financial', action: 'edit' })
  upsertValue(
    @Body() dto: UpsertFinancialValueDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.financialService.upsertValue(dto, user.userId);
  }

  @Get('summary')
  @Permissions({ module: 'financial', action: 'view' })
  getSummary() {
    return this.financialService.getSummary();
  }

  @Get('summary/by-branch')
  @Permissions({ module: 'financial', action: 'view' })
  getSummaryByBranch() {
    return this.financialService.getSummaryByBranch();
  }
}
