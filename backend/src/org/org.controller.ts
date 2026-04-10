import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@ApiTags('Org')
@ApiBearerAuth()
@Controller('org')
export class OrgController {
  constructor(private orgService: OrgService) {}

  @Get('companies')
  @Permissions({ module: 'dashboard', action: 'view' })
  getCompanies() {
    return this.orgService.getCompanies();
  }

  @Get('regions')
  @Permissions({ module: 'dashboard', action: 'view' })
  getRegions(@Query('company_id') companyId?: string) {
    return this.orgService.getRegions(companyId);
  }

  @Get('branches')
  @Permissions({ module: 'dashboard', action: 'view' })
  getBranches(@Query('region_id') regionId?: string) {
    return this.orgService.getBranches(regionId);
  }

  @Get('teams')
  @Permissions({ module: 'dashboard', action: 'view' })
  getTeams(@Query('branch_id') branchId?: string) {
    return this.orgService.getTeams(branchId);
  }

  @Get('roles')
  @Permissions({ module: 'users', action: 'view' })
  getRoles() {
    return this.orgService.getRoles();
  }

  @Get('resale-statuses')
  @Permissions({ module: 'resales', action: 'view' })
  getResaleStatuses() {
    return this.orgService.getResaleStatuses();
  }

  @Get('users')
  @Permissions({ module: 'users', action: 'view' })
  getUsers(@Query('team_id') teamId?: string) {
    return this.orgService.getUsersSimple(teamId);
  }
}
