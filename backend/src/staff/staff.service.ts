import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { StaffRole } from '../common/roles.enum';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff } from './staff.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    private activityService: ActivityService,
  ) {}

  async findAll(): Promise<Staff[]> {
    return this.staffRepo.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Staff> {
    const staff = await this.staffRepo.findOne({ where: { id } });
    if (!staff) throw new NotFoundException('Staff member not found');
    return staff;
  }

  async findByEmailWithPassword(email: string): Promise<Staff | null> {
    return this.staffRepo
      .createQueryBuilder('staff')
      .addSelect('staff.passwordHash')
      .where('staff.email = :email', { email })
      .getOne();
  }

  async findByIdWithPassword(id: string): Promise<Staff | null> {
    return this.staffRepo
      .createQueryBuilder('staff')
      .addSelect('staff.passwordHash')
      .where('staff.id = :id', { id })
      .getOne();
  }

  async setPassword(id: string, newPasswordHash: string): Promise<void> {
    await this.staffRepo.update(id, { passwordHash: newPasswordHash });
  }

  /** Admin-initiated reset for a locked-out staff member. Returns the plaintext
   * temp password once — it is never retrievable again after this call returns. */
  async resetPassword(id: string, actorId: string): Promise<{ tempPassword: string }> {
    const staff = await this.findOne(id);
    const tempPassword = randomBytes(6).toString('base64url'); // ~8 url-safe chars
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await this.staffRepo.update(id, { passwordHash });
    await this.activityService.log(actorId, `Reset password for staff member "${staff.name}"`);
    return { tempPassword };
  }

  async setPin(id: string, plainPin: string): Promise<void> {
    const pinHash = await bcrypt.hash(plainPin, SALT_ROUNDS);
    await this.staffRepo.update(id, { pinHash });
  }

  /** Used to gate discount/refund approval: any active Admin's PIN is accepted. */
  async verifyAnyAdminPin(plainPin: string): Promise<boolean> {
    const admins = await this.staffRepo
      .createQueryBuilder('staff')
      .addSelect('staff.pinHash')
      .where('staff.role = :role', { role: StaffRole.ADMIN })
      .andWhere('staff.isActive = true')
      .getMany();

    for (const admin of admins) {
      if (admin.pinHash && (await bcrypt.compare(plainPin, admin.pinHash))) {
        return true;
      }
    }
    return false;
  }

  async create(dto: CreateStaffDto): Promise<Staff> {
    const existing = await this.staffRepo.findOne({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException(
        'A staff member with this email already exists',
      );

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const staff = this.staffRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
    const saved = await this.staffRepo.save(staff);
    // save() returns the in-memory entity, which still carries passwordHash despite
    // { select: false } on the column (that flag only affects SELECT queries) — re-fetch
    // through findOne() so the hash never leaves the service.
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateStaffDto): Promise<Staff> {
    const staff = await this.findOne(id);

    if (
      dto.role &&
      dto.role !== StaffRole.ADMIN &&
      staff.role === StaffRole.ADMIN
    ) {
      await this.assertNotLastAdmin(id);
    }
    if (dto.isActive === false && staff.role === StaffRole.ADMIN) {
      await this.assertNotLastAdmin(id);
    }

    Object.assign(staff, dto);
    return this.staffRepo.save(staff);
  }

  async remove(id: string): Promise<void> {
    const staff = await this.findOne(id);
    if (staff.role === StaffRole.ADMIN) {
      await this.assertNotLastAdmin(id);
    }
    await this.staffRepo.remove(staff);
  }

  private async assertNotLastAdmin(excludingId: string): Promise<void> {
    const remainingAdmins = await this.staffRepo
      .createQueryBuilder('staff')
      .where('staff.role = :role', { role: StaffRole.ADMIN })
      .andWhere('staff.id != :id', { id: excludingId })
      .getCount();
    if (remainingAdmins === 0) {
      throw new BadRequestException('At least one active Admin must remain');
    }
  }
}
