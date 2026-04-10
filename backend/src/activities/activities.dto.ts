import {
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsIn,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({ enum: ['whatsapp', 'call', 'meeting', 'cartorio', 'caixa_interview', 'signing', 'uber', 'visit', 'note', 'email', 'other'] })
  @IsString()
  @IsNotEmpty()
  activity_type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  process_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiProperty()
  @IsDateString()
  scheduled_at: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateActivityDto {
  @ApiPropertyOptional({ enum: ['whatsapp', 'call', 'meeting', 'cartorio', 'caixa_interview', 'signing', 'uber', 'visit', 'note', 'email', 'other'] })
  @IsOptional()
  @IsString()
  activity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completed_at?: string;

  @ApiPropertyOptional({ enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  @IsOptional()
  @IsIn(['scheduled', 'completed', 'cancelled', 'no_show'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListActivitiesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  process_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ enum: ['whatsapp', 'call', 'meeting', 'cartorio', 'caixa_interview', 'signing', 'uber', 'visit', 'note', 'email', 'other'] })
  @IsOptional()
  @IsString()
  activity_type?: string;

  @ApiPropertyOptional({ enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_to?: string;

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
