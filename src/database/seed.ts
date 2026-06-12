import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Connection } from 'mongoose';
import { AppModule } from '../app.module';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

export function assertSeederAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Seeder is disabled when NODE_ENV=production');
  }
}

export async function runSeeder(argv = process.argv.slice(2)): Promise<void> {
  assertSeederAllowed(process.env.NODE_ENV);
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    if (argv.includes('--reset')) {
      await connection.db?.dropDatabase();
    }

    const usersService = app.get(UsersService);
    const password = await bcrypt.hash(process.env.SEED_PASSWORD || 'ChangeMe123!', 10);

    const admin = await ensureUser(usersService, {
      fullName: 'Seed Admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
      password,
      role: Role.Admin,
      status: 'active',
    });
    const owner = await ensureUser(usersService, {
      fullName: 'Seed Owner',
      email: process.env.SEED_OWNER_EMAIL || 'owner@example.com',
      password,
      role: Role.Owner,
      status: 'active',
    });
    const user = await ensureUser(usersService, {
      fullName: 'Seed User',
      email: process.env.SEED_USER_EMAIL || 'user@example.com',
      password,
      role: Role.User,
      status: 'active',
    });

    console.log(
      `Seed complete. Accounts: ${admin.email}, ${owner.email}, ${user.email}`,
    );
  } finally {
    await app.close();
  }
}

async function ensureUser(
  usersService: UsersService,
  user: Parameters<UsersService['create']>[0],
) {
  return (await usersService.findByEmail(user.email)) || usersService.create(user);
}

if (require.main === module) {
  void runSeeder().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
