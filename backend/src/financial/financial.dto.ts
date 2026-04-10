import { IsNumber, IsOptional, IsString, IsUUID, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertFinancialValueDto {
  @ApiProperty()
  @IsUUID()
  resale_id: string;

  @ApiProperty({ description: 'code do componente financeiro' })
  @IsString()
  component_code: string;

  @ApiProperty()
  @IsNumber()
  @Min(-999999999.99)
  @Max(999999999.99)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'reference_date deve ser YYYY-MM-DD' })
  reference_date?: string;
}
