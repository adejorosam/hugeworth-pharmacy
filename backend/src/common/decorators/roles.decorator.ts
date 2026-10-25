import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '../roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
