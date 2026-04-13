import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMETYPES = [
  'text/csv',
  'application/json',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Get('sources')
  @Permissions({ module: 'imports', action: 'view' })
  listSources() {
    return this.importsService.listSources();
  }

  @Get('batches')
  @Permissions({ module: 'imports', action: 'view' })
  listBatches(
    @Query('status') status?: string,
    @Query('import_type') importType?: string,
  ) {
    return this.importsService.listBatches({ status, import_type: importType });
  }

  @Get('batches/:id')
  @Permissions({ module: 'imports', action: 'view' })
  getBatchDetail(@Param('id') id: string) {
    return this.importsService.getBatchDetail(id);
  }

  @Get('snapshot-batches')
  @Permissions({ module: 'imports', action: 'view' })
  listSnapshotBatches() {
    return this.importsService.listSnapshotBatches();
  }

  @Post('upload')
  @Permissions({ module: 'imports', action: 'upload' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiConsumes('multipart/form-data')
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
    @Body('source_id') sourceId?: string,
    @Body('import_type') importType?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Arquivo excede 10 MB');

    const isAllowed =
      ALLOWED_MIMETYPES.includes(file.mimetype) || /\.(csv|json|xlsx?)$/i.test(file.originalname);
    if (!isAllowed) throw new BadRequestException('Use CSV, JSON ou XLSX.');

    return this.importsService.uploadAndProcess(file, user.userId, sourceId, importType);
  }

  @Get('financial-items')
  @Permissions({ module: 'imports', action: 'view' })
  getFinancialItems(@Query('import_batch_id') importBatchId?: string) {
    return this.importsService.getFinancialItems(importBatchId);
  }

  @Get('batches/:id/status')
  @Permissions({ module: 'imports', action: 'view' })
  getBatchStatus(@Param('id') id: string) {
    return this.importsService.getBatchStatus(id);
  }

  @Get('batches/:id/items')
  @Permissions({ module: 'imports', action: 'view' })
  getBatchItems(
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.importsService.getBatchItems(id, status);
  }

  @Post('batches/:id/process')
  @Permissions({ module: 'imports', action: 'upload' })
  processBatch(@Param('id') id: string) {
    return this.importsService.processBatch(id);
  }

  @Delete('batches/:id')
  @Permissions({ module: 'imports', action: 'upload' })
  deleteBatch(@Param('id') id: string) {
    return this.importsService.deleteBatch(id);
  }

  @Get('migrate-to-crm/preview')
  @Permissions({ module: 'imports', action: 'view' })
  previewMigration() {
    return this.importsService.previewMigration();
  }

  @Post('migrate-to-crm')
  @Permissions({ module: 'imports', action: 'upload' })
  migrateResalesToCrm(@Query('force') force?: string) {
    return this.importsService.migrateResalesToCrm(force === 'true');
  }
}
