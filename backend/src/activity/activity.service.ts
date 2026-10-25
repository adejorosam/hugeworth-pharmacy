import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole } from '../common/roles.enum';
import { ActivityLog } from './activity-log.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityRepo: Repository<ActivityLog>,
  ) {}

  async log(staffId: string | null, action: string): Promise<void> {
    const entry = this.activityRepo.create({ staffId, action });
    await this.activityRepo.save(entry);
  }

  async findForUser(user: {
    id: string;
    role: StaffRole;
  }): Promise<ActivityLog[]> {
    const where = user.role === StaffRole.ADMIN ? {} : { staffId: user.id };
    return this.activityRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
