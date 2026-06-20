import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Connection, Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { ShippingUnit, ShippingUnitDocument } from './schemas/shipping-unit.schema';
import { ShipperProfile, ShipperProfileDocument } from './schemas/shipper-profile.schema';

export function assertSeederAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Seeder is disabled when NODE_ENV=production');
  }
}

export function assertDatabaseUriConfigured(
  mongodbUri: string | undefined,
  mongoUri: string | undefined,
): void {
  if (!mongodbUri && !mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI is required');
  }
}

export async function runSeeder(argv = process.argv.slice(2)): Promise<void> {
  assertSeederAllowed(process.env.NODE_ENV);
  assertDatabaseUriConfigured(process.env.MONGODB_URI, process.env.MONGO_URI);

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

    const shippingUnitEmail = process.env.SEED_SHIPPING_UNIT_EMAIL || 'shipping_unit@example.com';
    const shippingUnitUser = await ensureUser(usersService, {
      fullName: 'Seed Shipping Unit',
      email: shippingUnitEmail,
      password,
      role: Role.ShippingUnit,
      status: 'active',
    });

    const shippingUnitUserId = new Types.ObjectId((shippingUnitUser as any)._id || (shippingUnitUser as any).id);

    const shippingUnitModel = app.get<Model<ShippingUnitDocument>>(getModelToken(ShippingUnit.name));
    await shippingUnitModel.findOneAndUpdate(
      { userId: shippingUnitUserId },
      {
        companyName: 'Giao Hàng Nhanh Seed',
        coverageAreas: [
          { province: 'Hồ Chí Minh', ward: 'Phường Bến Nghé' },
          { province: 'Hồ Chí Minh', ward: 'Phường Bến Thành' },
        ],
        contactPhone: '0909123456',
        address: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM',
      },
      { upsert: true, new: true },
    );

    const shipperEmail = process.env.SEED_SHIPPER_EMAIL || 'shipper@example.com';
    const shipperUser = await ensureUser(usersService, {
      fullName: 'Seed Shipper',
      email: shipperEmail,
      password,
      role: Role.Shipper,
      status: 'active',
    });

    const shipperUserId = new Types.ObjectId((shipperUser as any)._id || (shipperUser as any).id);

    const shipperProfileModel = app.get<Model<ShipperProfileDocument>>(getModelToken(ShipperProfile.name));
    await shipperProfileModel.findOneAndUpdate(
      { userId: shipperUserId },
      {
        shippingUnitId: shippingUnitUserId,
        vehicleType: 'Xe máy',
        licensePlate: '59-S1 123.45',
        coverageArea: { province: 'Hồ Chí Minh', ward: 'Phường Bến Nghé' },
        isAvailable: true,
      },
      { upsert: true, new: true },
    );

    console.log(
      `Seed complete. Accounts: ${admin.email}, ${owner.email}, ${user.email}, ${shippingUnitUser.email}, ${shipperUser.email}`,
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
