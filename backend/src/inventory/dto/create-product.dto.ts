import { IsDateString, IsEnum, IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { Branch } from '../../common/branch.enum';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  category: string;

  @IsString()
  supplier: string;

  @IsEnum(Branch)
  branch: Branch;

  @IsInt()
  @Min(0)
  qty: number;

  @IsInt()
  @Min(0)
  minQty: number;

  @IsInt()
  @Min(0)
  reorderLevel: number;

  @IsDateString()
  expiryDate: string;

  @IsNumber()
  @Min(0)
  price: number;
}
