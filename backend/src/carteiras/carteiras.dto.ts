import { IsOptional, IsString, IsNumber, IsNotEmpty, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreateItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status_nome: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantidade?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  qtde_ligacao?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ordem?: number;
}

export class UpdateItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantidade_importada?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  qtde_ligacao_importada?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ordem?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CreateAjusteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantidade_manual?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  qtde_ligacao_manual?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class DuplicarSnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}
