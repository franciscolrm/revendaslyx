import {
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  enterprise_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  block_tower?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unit_number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ enum: ['apartment', 'house', 'commercial', 'land', 'other'] })
  @IsOptional()
  @IsIn(['apartment', 'house', 'commercial', 'land', 'other'])
  unit_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  area_m2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  original_value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  current_value?: number;

  @ApiPropertyOptional({ enum: ['available', 'sold', 'in_resale', 'reserved', 'transferred', 'unavailable'] })
  @IsOptional()
  @IsIn(['available', 'sold', 'in_resale', 'reserved', 'transferred', 'unavailable'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stock_available?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  original_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  current_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_cadin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_iptu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_condominio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_other?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debts_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enterprise_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  block_tower?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ enum: ['apartment', 'house', 'commercial', 'land', 'other'] })
  @IsOptional()
  @IsIn(['apartment', 'house', 'commercial', 'land', 'other'])
  unit_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  area_m2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  original_value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  current_value?: number;

  @ApiPropertyOptional({ enum: ['available', 'sold', 'in_resale', 'reserved', 'transferred', 'unavailable'] })
  @IsOptional()
  @IsIn(['available', 'sold', 'in_resale', 'reserved', 'transferred', 'unavailable'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stock_available?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  original_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  current_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_cadin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_iptu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_condominio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debts_other?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debts_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListUnitsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enterprise_id?: string;

  @ApiPropertyOptional({ enum: ['available', 'sold', 'in_resale', 'reserved', 'transferred', 'unavailable'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stock_available?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  per_page?: number;
}
