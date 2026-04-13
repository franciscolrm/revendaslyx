import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsNotEmpty,
  IsEmail,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ enum: ['seller', 'buyer', 'both'] })
  @IsIn(['seller', 'buyer', 'both'])
  client_type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document_number?: string;

  @ApiPropertyOptional({ enum: ['cpf', 'cnpj'] })
  @IsOptional()
  @IsIn(['cpf', 'cnpj'])
  document_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone_secondary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_zip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ enum: ['seller', 'buyer', 'both'] })
  @IsOptional()
  @IsIn(['seller', 'buyer', 'both'])
  client_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document_number?: string;

  @ApiPropertyOptional({ enum: ['cpf', 'cnpj'] })
  @IsOptional()
  @IsIn(['cpf', 'cnpj'])
  document_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone_secondary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_zip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'blocked'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'blocked'])
  status?: string;
}

export class ListClientsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['seller', 'buyer', 'both'] })
  @IsOptional()
  @IsString()
  client_type?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'blocked'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Comma-separated import_batch UUIDs' })
  @IsOptional()
  @IsString()
  import_batch_ids?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  per_page?: number;
}

export class AddClientContactDto {
  @ApiProperty({ enum: ['whatsapp', 'phone', 'email', 'visit', 'meeting', 'note'] })
  @IsString()
  @IsNotEmpty()
  contact_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
