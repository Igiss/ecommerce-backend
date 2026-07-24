import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('SettingsService SePay bank account resolution', () => {
  it('syncs the only active bank account linked on SePay', async () => {
    const setting = {
      key: 'sepay',
      bankName: 'MBBank',
      accountNumber: '03888888888',
      accountHolder: 'GIA DUNG 24H',
      apiKey: '',
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        return this;
      },
    };
    const settingModel = {
      findOne: () => ({ exec: async () => setting }),
      create: async () => setting,
    };
    const config = {
      SEPAY_USER_API_TOKEN: 'test-api-key',
      SEPAY_API_KEY: '',
      SEPAY_BANK_ACCOUNT_ID: '',
      SEPAY_BANK_NAME: '',
      SEPAY_ACC_NUMBER: '',
      SEPAY_ACC_HOLDER: '',
    };
    const configService = {
      get: (key: keyof typeof config) => config[key] || '',
    } as unknown as ConfigService;

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://my.sepay.vn/userapi/bankaccounts/list');
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        'Bearer test-api-key',
      );
      return new Response(
        JSON.stringify({
          status: 200,
          bankaccounts: [
            {
              id: '25',
              account_holder_name: 'NGUYEN VAN A',
              account_number: '0071000123456',
              active: '1',
              bank_short_name: 'Vietcombank',
              bank_code: 'VCB',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const service = new (SettingsService as unknown as {
      new (model: unknown, config: ConfigService): SettingsService;
    })(settingModel, configService);
    const result = await service.getSepaySettings();

    assert.equal(result.bankName, 'VCB');
    assert.equal(result.accountNumber, '0071000123456');
    assert.equal(result.accountHolder, 'NGUYEN VAN A');
    assert.equal(setting.saveCalls, 1);
  });
});
