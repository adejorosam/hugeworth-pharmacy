import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class SaleItemInput {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsBoolean()
  overrideExpiry?: boolean;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInput)
  items: SaleItemInput[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPct?: number;

  @IsOptional()
  @IsString()
  managerPin?: string;
}
