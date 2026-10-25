import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { StaffRole } from '../../common/roles.enum';

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(StaffRole)
  role: StaffRole;
}
