import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [ProductsModule, CouponsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
