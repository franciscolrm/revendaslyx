import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('pipeline')
  @Permissions({ module: 'dashboard', action: 'view' })
  getPipeline(@Query('snapshot_batch_id') snapshotBatchId?: string) {
    return this.dashboardService.getPipeline(snapshotBatchId);
  }

  @Get('pipeline/by-branch')
  @Permissions({ module: 'dashboard', action: 'view' })
  getPipelineByBranch() {
    return this.dashboardService.getPipelineByBranch();
  }

  @Get('team-performance')
  @Permissions({ module: 'dashboard', action: 'view' })
  getTeamPerformance() {
    return this.dashboardService.getTeamPerformance();
  }

  @Get('user-performance')
  @Permissions({ module: 'dashboard', action: 'view' })
  getUserPerformance() {
    return this.dashboardService.getUserPerformance();
  }

  @Get('snapshots')
  @Permissions({ module: 'dashboard', action: 'view' })
  getSnapshotEvolution(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('snapshot_batch_id') snapshotBatchId?: string,
  ) {
    return this.dashboardService.getSnapshotEvolution(startDate, endDate, snapshotBatchId);
  }

  @Post('snapshots/generate')
  @Permissions({ module: 'reports', action: 'export' })
  generateSnapshot(@Query('reference_date') referenceDate?: string) {
    return this.dashboardService.generateSnapshot(referenceDate);
  }
}
