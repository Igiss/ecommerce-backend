import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Counter, CounterSchema } from '../database/schemas/counter.schema';
import { UserAddress, UserAddressSchema } from '../database/schemas/user-address.schema';
import { ShippingUnitsModule } from '../shipping-units/shipping-units.module';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAddress.name, schema: UserAddressSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    ShippingUnitsModule,
  ],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
