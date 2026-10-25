import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '../common/roles.enum';
import { ActivityService } from './activity.service';

@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string; role: StaffRole }) {
    return this.activityService.findForUser(user);
  }
}
