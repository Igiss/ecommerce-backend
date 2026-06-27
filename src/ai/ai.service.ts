import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;
  private readonly isAiEnabled: boolean;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.isAiEnabled = true;
      this.logger.log('Google Gemini AI initialized successfully.');
    } else {
      this.isAiEnabled = false;
      this.logger.warn('GEMINI_API_KEY is missing. AI features will be disabled.');
    }
  }

  async generateTrendReport(salesData: any, ownerId?: string): Promise<string> {
    if (!this.isAiEnabled) {
      return 'Chức năng AI hiện chưa được cấu hình (thiếu API Key). Vui lòng cấu hình `GEMINI_API_KEY` trong môi trường.';
    }

    // FIX DATA LEAK: Khóa cache phải phụ thuộc vào ownerId
    const cacheKey = ownerId ? `ai_trend_report_${ownerId}` : 'ai_trend_report_admin';
    const cachedReport = await this.cacheManager.get<string>(cacheKey);
    if (cachedReport) {
      this.logger.log(`Returning cached AI trend report for ${ownerId || 'admin'}`);
      return cachedReport;
    }

    try {
      const prompt = `
Bạn là một chuyên gia phân tích dữ liệu bán hàng. Dưới đây là dữ liệu tổng quan và chi tiết doanh thu theo từng ngày của cửa hàng (30 ngày qua).
Vui lòng phân tích và viết một báo cáo ngắn gọn:
1. Phân tích xu hướng dựa trên biểu đồ doanh thu từng ngày (ngày nào cao/thấp, tăng hay giảm).
2. Nhận xét về các sản phẩm đang bán chạy nhất.
3. Dự đoán xu hướng mua hàng trong tháng tới dựa trên dữ liệu này.
4. Đề xuất một vài hành động (ví dụ: nhập thêm hàng, chạy khuyến mãi) cho chủ shop.

Dữ liệu JSON:
${JSON.stringify(salesData, null, 2)}

Trả về báo cáo bằng ngôn ngữ Tiếng Việt, sử dụng định dạng Markdown rõ ràng, đẹp mắt (dùng heading, danh sách, in đậm/nghiêng). Đừng viết lời mở đầu thừa thãi, đi thẳng vào báo cáo.
`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const report = response.text || 'Không thể tạo báo cáo vào lúc này.';
      
      // Lưu cache trong 24 giờ
      await this.cacheManager.set(cacheKey, report, 24 * 60 * 60 * 1000);
      return report;
    } catch (error) {
      this.logger.error('Failed to generate trend report', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isAiEnabled) return [];

    try {
      const response = await this.ai.models.embedContent({
        model: 'gemini-embedding-exp-03-07',
        contents: text,
      });
      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      return [];
    }
  }
}
