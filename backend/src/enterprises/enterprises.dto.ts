import { IsOptional, IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnterpriseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

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
  @IsNumber()
  total_units?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEnterpriseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

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
  @IsNumber()
  total_units?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
