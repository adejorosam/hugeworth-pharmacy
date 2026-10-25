import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ActivityService } from '../activity/activity.service';
import { StaffService } from '../staff/staff.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private staffService: StaffService,
    private jwtService: JwtService,
    private activityService: ActivityService,
  ) {}

  async login(dto: LoginDto) {
    const staff = await this.staffService.findByEmailWithPassword(dto.email);
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: staff.id, role: staff.role };
    const accessToken = await this.jwtService.signAsync(payload);

    await this.activityService.log(staff.id, 'Logged in');

    return {
      accessToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    };
  }

  async changePassword(staffId: string, dto: ChangePasswordDto): Promise<void> {
    const staff = await this.staffService.findByIdWithPassword(staffId);
    if (!staff) throw new UnauthorizedException();

    const matches = await bcrypt.compare(
      dto.currentPassword,
      staff.passwordHash,
    );
    if (!matches)
      throw new BadRequestException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.staffService.setPassword(staffId, newHash);
    await this.activityService.log(staffId, 'Changed password');
  }
}
