import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ValidateDocumentDto,
  ListDocumentsQueryDto,
} from './documents.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  @Permissions({ module: 'documents', action: 'view' })
  list(@Query() query: ListDocumentsQueryDto) {
    return this.documentsService.list(query);
  }

  @Get('categories')
  @Permissions({ module: 'documents', action: 'view' })
  listCategories() {
    return this.documentsService.listCategories();
  }

  @Get(':id')
  @Permissions({ module: 'documents', action: 'view' })
  findById(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Post()
  @Permissions({ module: 'documents', action: 'create' })
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.create(dto, user.userId);
  }

  @Post('upload')
  @Permissions({ module: 'documents', action: 'create' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiConsumes('multipart/form-data')
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Arquivo excede 20 MB');

    return this.documentsService.upload(file, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'documents', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Post(':id/validate')
  @Permissions({ module: 'documents', action: 'edit' })
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentsService.validate(id, dto, user.userId);
  }

  @Delete(':id')
  @Permissions({ module: 'documents', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
