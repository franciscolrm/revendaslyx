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
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsQueryDto,
  AddClientContactDto,
} from './clients.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  @Permissions({ module: 'clients', action: 'view' })
  list(
    @Query() query: ListClientsQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.list(query);
  }

  @Get(':id')
  @Permissions({ module: 'clients', action: 'view' })
  findById(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Post()
  @Permissions({ module: 'clients', action: 'create' })
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.create(dto, user.userId);
  }

  @Patch(':id')
  @Permissions({ module: 'clients', action: 'edit' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions({ module: 'clients', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Post(':id/contacts')
  @Permissions({ module: 'clients', action: 'edit' })
  addContact(
    @Param('id') id: string,
    @Body() dto: AddClientContactDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.addContact(id, dto, user.userId);
  }

  @Get(':id/contacts')
  @Permissions({ module: 'clients', action: 'view' })
  listContacts(@Param('id') id: string) {
    return this.clientsService.listContacts(id);
  }
}
