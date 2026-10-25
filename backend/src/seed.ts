import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StaffRole } from './common/roles.enum';
import { StaffService } from './staff/staff.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const staffService = app.get(StaffService);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@hugeworthpharmacy.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.SEED_ADMIN_NAME ?? 'Debola Aro';

  const existing = await staffService.findByEmailWithPassword(email);
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Admin account already exists for ${email} — nothing to do.`);
    await app.close();
    return;
  }

  await staffService.create({ name, email, password, role: StaffRole.ADMIN });
  // eslint-disable-next-line no-console
  console.log(`Created initial Admin: ${email} / ${password}`);
  // eslint-disable-next-line no-console
  console.log('Log in and change this password immediately.');

  await app.close();
}

seed();
