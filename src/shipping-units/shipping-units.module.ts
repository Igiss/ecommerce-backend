import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { ShippingUnit, ShippingUnitSchema } from '../database/schemas/shipping-unit.schema';
import { ShipperProfile, ShipperProfileSchema } from '../database/schemas/shipper-profile.schema';
import { User, UserSchema } from '../database/schemas/user.schema';
import { ShippingUnitsController } from './shipping-units.controller';
import { ShipperManagementController } from './shipper-management.controller';
import { ShipperAssignmentController } from './shipper-assignment.controller';
import { ShippingUnitsService } from './shipping-units.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShippingUnit.name, schema: ShippingUnitSchema },
      { name: ShipperProfile.name, schema: ShipperProfileSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    ShippingUnitsController,
    ShipperManagementController,
    ShipperAssignmentController,
  ],
  providers: [ShippingUnitsService],
  exports: [ShippingUnitsService],
})
export class ShippingUnitsModule {}
