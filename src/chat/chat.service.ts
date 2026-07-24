import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductsService } from '../products/products.service';
import { CouponsService } from '../coupons/coupons.service';
import { ChatDto } from './dto/chat.dto';
import { getActivePrice } from '../common/helpers/price.helper';

@Injectable()
export class ChatService {
  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly couponsService: CouponsService,
  ) {}

  async chat(dto: ChatDto) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Trợ lý AI hiện chưa sẵn sàng. Bạn vui lòng thử lại sau.',
      );
    }

    const messages = dto.messages?.length
      ? dto.messages
      : dto.message
        ? [{ role: 'user' as const, content: dto.message }]
        : [];

    if (!messages.length) {
      throw new BadRequestException('message or messages is required');
    }

    const userMessage = messages.at(-1)?.content || '';

    // Fetch relevant products with full details
    const products = await this.productsService.searchForAssistant(userMessage);

    const productContext = (products as unknown as Record<string, unknown>[]).map((product) => {
      const catObj = product.categoryId as { name?: string } | undefined;
      const catName = typeof product.categoryId === 'object' && product.categoryId !== null
        ? catObj?.name || 'Gia dụng'
        : (product.category as string) || 'Gia dụng';

      return {
        id: (product.productId as string) || (product.id as string) || String(product._id),
        name: product.name as string,
        category: catName,
        brand: (product.brand as string) || 'Gia Dụng 24h',
        price: getActivePrice(product as Parameters<typeof getActivePrice>[0]),
        originalPrice: product.price as number,
        stock: product.stock as number,
        rating: (product.rating as number) || 4.5,
        description: (product.description as string) || 'Chưa có mô tả sản phẩm',
        images: (product.images as string[]) || [],
        modelUrl: (product.modelUrl as string) || null,
      };
    });

    // Fetch active coupons / vouchers
    let voucherContext: Record<string, unknown>[] = [];
    try {
      const allCoupons = await this.couponsService.findAll();
      const now = new Date();
      voucherContext = (allCoupons as unknown as Record<string, unknown>[])
        .filter((c) => Boolean(c.isActive) && (!c.expiryDate || new Date(c.expiryDate as string | Date) > now))
        .map((c) => ({
          code: c.code,
          discountType: c.discountType,
          discountAmount: c.discountAmount,
          minOrderValue: c.minOrderValue || 0,
          description: `Mã giảm giá ${c.code}`,
        }));
    } catch (e) {
      console.error('Failed to fetch coupons for AI context:', e);
    }

    const systemInstruction = `
Bạn là Trợ lý Ảo AI chuyên gia tư vấn sản phẩm và so sánh thiết bị gia dụng nhà bếp & đồ dùng thông minh của Gia Dụng 24h (giadung24h.vn).

Nhiệm vụ chính của bạn:
1. **Tư vấn sản phẩm chuyên sâu**:
   - Dựa trên \`description\`, \`category\`, \`price\`, \`rating\`, \`brand\` trong \`Product context\`, phân tích rõ công dụng, tính năng nổi bật, ưu điểm của sản phẩm.
   - Gợi ý đúng sản phẩm người dùng đang quan tâm.

2. **So sánh sản phẩm (So sánh chi tiết)**:
   - Khi người dùng yêu cầu so sánh (ví dụ: so sánh giữa 2 hoặc nhiều sản phẩm), hãy lập bảng hoặc liệt kê so sánh dựa trên các tiêu chí: **Giá bán (Giá ưu đãi / Giá gốc)**, **Danh mục & Thương hiệu**, **Tính năng & Mô tả sản phẩm (\`description\`)**, **Đánh giá (\`rating\`)** và **Khuyên dùng chọn sản phẩm nào cho nhu cầu gì**.

3. **Tư vấn Mã Giảm Giá (Voucher)**:
   - Khi người dùng hỏi về mã giảm giá hoặc tư vấn mua tiết kiệm, kiểm tra dữ liệu \`Voucher context\` và cung cấp mã voucher áp dụng phù hợp.

Chính sách cửa hàng Gia Dụng 24h:
- 🛡️ Bảo hành chính hãng 12 tháng, 1 đổi 1 trong 30 ngày nếu có lỗi NSX.
- 🚚 Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ.
- ⚡ Giao hàng hỏa tốc trong 24h tại TP.HCM & Hà Nội.
- 🔄 Đổi trả hàng tận nhà miễn phí trong 7 ngày.
- 🎨 Có dịch vụ tự thiết kế ly cốc 3D độc bản.

Quy tắc trình bày:
- Luôn sử dụng tiếng Việt tự nhiên, thân thiện, dùng emoji phù hợp (🍳, ⚡, 📦, ⭐, 💡).
- Trình bày thông tin rõ ràng bằng các gạch đầu dòng, danh sách hoặc tiêu đề in đậm.
- Tuyệt đối không bịa đặt sản phẩm hoặc thông tin không có trong \`Product context\`.
`.trim();

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash-lite',
      systemInstruction,
    });

    const prompt = [
      `Product context (Danh sách sản phẩm chi tiết): ${JSON.stringify(productContext)}`,
      `Voucher context (Mã giảm giá khả dụng): ${JSON.stringify(voucherContext)}`,
      ...messages.map((message) => `${message.role}: ${message.content}`),
    ].join('\n');

    try {
      const result = await model.generateContent(prompt);
      const replyText = result.response.text();

      // Strict Filter: Ensure only products matching the requested type & AI reply are returned
      const matchedProducts = productContext.filter((p) => {
        const pName = p.name.toLowerCase();
        const pCat = p.category.toLowerCase();
        const replyLower = replyText.toLowerCase();
        const msgLower = userMessage.toLowerCase();

        // Check if user specified a product category/type keyword
        const productTypes = [
          'nồi chiên',
          'lò vi sóng',
          'tủ lạnh',
          'máy giặt',
          'máy hút bụi',
          'robot hút bụi',
          'điều hòa',
          'ly',
          'cốc',
          'bình giữ nhiệt'
        ];
        const queriedType = productTypes.find((type) => msgLower.includes(type));

        if (queriedType) {
          // If query specifies "nồi chiên", strictly reject non-"nồi chiên" products!
          const pDesc = p.description ? p.description.toLowerCase() : '';
          if (!pName.includes(queriedType) && !pCat.includes(queriedType) && !pDesc.includes(queriedType)) {
            return false;
          }
        }

        // Must be mentioned in AI reply
        if (replyLower.includes(pName)) return true;

        const nameTokens = pName.split(/\s+/).filter((t: string) => t.length >= 3 && !['chủ', 'loại', 'giá', 'cho', 'với', 'không', 'dụng'].includes(t));
        const matchCount = nameTokens.filter((token: string) => replyLower.includes(token)).length;

        return nameTokens.length > 0 && matchCount >= Math.ceil(nameTokens.length * 0.6);
      });

      const finalProducts = matchedProducts.length > 0 ? matchedProducts.slice(0, 4) : [];

      return { reply: replyText, products: finalProducts };
    } catch (error) {
      const geminiError = error as { status?: number; message?: string };
      const providerMessage = geminiError.message || '';
      const isOverloaded =
        geminiError.status === HttpStatus.SERVICE_UNAVAILABLE ||
        /503|service unavailable|high demand|overload/i.test(providerMessage);

      if (geminiError.status === HttpStatus.TOO_MANY_REQUESTS) {
        throw new HttpException(
          'Trợ lý AI đang nhận quá nhiều yêu cầu. Bạn vui lòng thử lại sau ít phút.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (isOverloaded) {
        throw new ServiceUnavailableException(
          'Trợ lý AI đang quá tải. Bạn vui lòng thử lại sau ít phút.',
        );
      }

      throw new ServiceUnavailableException(
        'Trợ lý AI tạm thời gặp sự cố. Bạn vui lòng thử lại sau.',
      );
    }
  }
}
