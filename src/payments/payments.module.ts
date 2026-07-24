import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { Payment, PaymentSchema } from '../database/schemas/payment.schema';
import { PaymentsController, VnpayController, SepayWebhookController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [PaymentsController, VnpayController, SepayWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
