import {
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

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
  unit_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ValidateDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListDocumentsQueryDto {
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
  unit_id?: string;

  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

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
