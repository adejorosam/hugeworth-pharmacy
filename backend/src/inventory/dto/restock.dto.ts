import { IsInt, Min } from 'class-validator';

export class RestockDto {
  @IsInt()
  @Min(1)
  amount: number;
}
