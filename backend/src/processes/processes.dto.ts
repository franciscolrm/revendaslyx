import {
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProcessDto {
  @ApiProperty()
  @IsUUID()
  flow_type_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unit_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seller_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyer_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_user_id?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProcessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unit_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seller_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buyer_client_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_user_id?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ enum: ['active', 'paused', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['active', 'paused', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancel_reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListProcessesQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'paused', 'completed', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  flow_type_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stage_group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_user_id?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

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

export class AdvanceStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RevertStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  is_internal?: boolean;
}
