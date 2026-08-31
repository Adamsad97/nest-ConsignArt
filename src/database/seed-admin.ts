import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';

/**
 * Bootstraps the platform's first admin account. Admin accounts are never
 * self-registrable via the public API (see SELF_REGISTERABLE_ROLES in
 * RegisterDto), so this script is the only way to create one. Safe to run
 * repeatedly: it's a no-op if ADMIN_EMAIL already exists.
 */
async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Platform';
  const lastName = process.env.ADMIN_LAST_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin account',
    );
  }

  await AppDataSource.initialize();
  const usersRepository = AppDataSource.getRepository(User);

  const existing = await usersRepository.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin account "${email}" already exists, skipping.`);
    await AppDataSource.destroy();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = usersRepository.create({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    role: Role.ADMIN,
    isActive: true,
  });
  await usersRepository.save(admin);

  console.log(`Admin account "${email}" created.`);
  await AppDataSource.destroy();
}

seedAdmin().catch((error: unknown) => {
  console.error('Failed to seed admin account:', error);
  process.exit(1);
});
