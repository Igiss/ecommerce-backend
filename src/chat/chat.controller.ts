import { Body, Controller, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: '[Public] Chat với trợ lý mua sắm AI' })
  @ApiCreatedResponse({
    description: 'Phản hồi của chatbot',
    schema: {
      example: {
        reply: 'Bạn có thể tham khảo sản phẩm...',
        products: [{ id: 1, name: 'Cốc sứ', price: 150000, stock: 12, images: [] }],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Body thiếu message/messages hoặc nội dung tin nhắn không hợp lệ',
  })
  chat(@Body() dto: ChatDto) {
    return this.chatService.chat(dto);
  }
}
