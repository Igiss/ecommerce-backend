import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [ProductsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
