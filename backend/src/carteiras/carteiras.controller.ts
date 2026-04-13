import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CarteirasService } from './carteiras.service';
import {
  CreateSnapshotDto,
  CreateItemDto,
  UpdateItemDto,
  CreateAjusteDto,
  DuplicarSnapshotDto,
} from './carteiras.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('Carteiras')
@ApiBearerAuth()
@Controller('carteiras')
export class CarteirasController {
  constructor(private service: CarteirasService) {}

  @Get()
  @Permissions({ module: 'dashboard', action: 'view' })
  listCarteiras() {
    return this.service.listCarteiras();
  }

  @Get(':carteira/datas')
  @Permissions({ module: 'dashboard', action: 'view' })
  listDatas(@Param('carteira') carteira: string) {
    return this.service.listDatas(carteira);
  }

  @Get(':carteira/:data')
  @Permissions({ module: 'dashboard', action: 'view' })
  getConsolidado(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
  ) {
    return this.service.getConsolidado(carteira, data);
  }

  @Post(':carteira/:data')
  @Permissions({ module: 'dashboard', action: 'view' })
  createSnapshot(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
    @Body() dto: CreateSnapshotDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createSnapshot(carteira, data, dto, user.userId);
  }

  @Post(':carteira/:data/duplicar')
  @Permissions({ module: 'dashboard', action: 'view' })
  duplicarSnapshot(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
    @Query('data_destino') dataDestino: string,
    @Body() dto: DuplicarSnapshotDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.duplicarSnapshot(carteira, data, dataDestino, dto, user.userId);
  }

  @Post(':carteira/:data/itens')
  @Permissions({ module: 'dashboard', action: 'view' })
  createItem(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
    @Body() dto: CreateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createItem(carteira, data, dto, user.userId);
  }

  @Put(':carteira/:data/itens/:itemId')
  @Permissions({ module: 'dashboard', action: 'view' })
  updateItem(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateItem(carteira, data, itemId, dto, user.userId);
  }

  @Post(':carteira/:data/itens/:itemId/ajuste')
  @Permissions({ module: 'dashboard', action: 'view' })
  createAjuste(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateAjusteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createAjuste(carteira, data, itemId, dto, user.userId);
  }

  @Delete(':carteira/:data/itens/:itemId/ajuste')
  @Permissions({ module: 'dashboard', action: 'view' })
  removeAjuste(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeAjuste(carteira, data, itemId, user.userId);
  }

  @Get(':carteira/:data/auditoria')
  @Permissions({ module: 'dashboard', action: 'view' })
  getAuditoria(
    @Param('carteira') carteira: string,
    @Param('data') data: string,
  ) {
    return this.service.getAuditoria(carteira, data);
  }

  @Post(':carteira/sync')
  @Permissions({ module: 'imports', action: 'upload' })
  syncFromImported(@Param('carteira') carteira: string) {
    return this.service.syncFromImportedSnapshots(carteira);
  }
}
