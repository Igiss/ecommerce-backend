import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductsService } from '../products/products.service';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
  ) {}

  async chat(dto: ChatDto) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY is not configured');
    }

    const products = await this.productsService.searchForAssistant(
      dto.messages.at(-1)?.content || '',
    );
    const productContext = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.salePrice ?? product.price,
      stock: product.stock,
      images: product.images,
    }));

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash-lite',
      systemInstruction:
        'You are the shopping assistant for Cup Store. Only answer questions about the store and its products. Never invent products. Use the supplied product context.',
    });

    const prompt = [
      `Product context: ${JSON.stringify(productContext)}`,
      ...dto.messages.map((message) => `${message.role}: ${message.content}`),
    ].join('\n');

    try {
      const result = await model.generateContent(prompt);
      return { reply: result.response.text(), products: productContext };
    } catch (error) {
      const geminiError = error as { status?: number; message?: string };
      if (geminiError.status === HttpStatus.TOO_MANY_REQUESTS) {
        throw new HttpException(
          'Gemini quota exceeded. Please retry later or check the API quota.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new ServiceUnavailableException(
        geminiError.message || 'Gemini service is unavailable',
      );
    }
  }
}
