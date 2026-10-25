import { IsNumberString, Length } from 'class-validator';

export class SetPinDto {
  @IsNumberString()
  @Length(4, 6)
  pin: string;
}
