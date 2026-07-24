import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CouponsService } from '../coupons/coupons.service';
import { ProductsService } from '../products/products.service';
import { ChatService } from './chat.service';

describe('ChatService error handling', () => {
  it('returns a safe Vietnamese message when Gemini is overloaded', async () => {
    const prototype = GoogleGenerativeAI.prototype as unknown as {
      getGenerativeModel: (...args: unknown[]) => unknown;
    };
    const originalGetGenerativeModel = prototype.getGenerativeModel;
    prototype.getGenerativeModel = () => ({
      generateContent: async () => {
        const error = new Error(
          '[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/: [503 Service Unavailable] This model is currently experiencing high demand.',
        ) as Error & { status: number };
        error.status = 503;
        throw error;
      },
    });

    const service = new ChatService(
      {
        get: (key: string) => {
          if (key === 'GEMINI_API_KEY') return 'test-key';
          if (key === 'GEMINI_MODEL') return 'gemini-test-model';
          return undefined;
        },
      } as unknown as ConfigService,
      {
        searchForAssistant: async () => [],
      } as unknown as ProductsService,
      {
        findAll: async () => [],
      } as unknown as CouponsService,
    );

    try {
      await assert.rejects(
        service.chat({ message: 'Tư vấn cho tôi một sản phẩm' }),
        (error: unknown) =>
          error instanceof ServiceUnavailableException &&
          error.message ===
            'Trợ lý AI đang quá tải. Bạn vui lòng thử lại sau ít phút.' &&
          !error.message.includes('googleapis.com'),
      );
    } finally {
      prototype.getGenerativeModel = originalGetGenerativeModel;
    }
  });
});
