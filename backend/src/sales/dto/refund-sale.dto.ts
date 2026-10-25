import { IsOptional, IsString } from 'class-validator';

export class RefundSaleDto {
  @IsOptional()
  @IsString()
  managerPin?: string;
}
