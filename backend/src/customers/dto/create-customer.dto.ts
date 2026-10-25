import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  phone: string;

  @IsString()
  medication: string;

  @IsDateString()
  refillDue: string;
}
