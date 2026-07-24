import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from '../database/schemas/setting.schema';

interface SepayBankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  active: string;
  bank_short_name?: string;
  bank_code?: string;
}

interface SepayBankAccountsResponse {
  status?: number;
  bankaccounts?: SepayBankAccount[];
}

const LEGACY_SEPAY_SETTINGS = {
  bankName: 'MBBank',
  accountNumber: '03888888888',
  accountHolder: 'GIA DUNG 24H',
};

const SEPAY_ACCOUNT_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SettingsService {
  private linkedAccountCache:
    | {
        cacheKey: string;
        expiresAt: number;
        account: SepayBankAccount;
      }
    | undefined;

  constructor(
    @InjectModel(Setting.name)
    private readonly settingModel: Model<SettingDocument>,
    private readonly configService: ConfigService,
  ) {}

  async getSepaySettings() {
    let setting = await this.settingModel.findOne({ key: 'sepay' }).exec();
    const envBankName = this.configService.get<string>('SEPAY_BANK_NAME')?.trim() || '';
    const envAccountNumber =
      this.configService.get<string>('SEPAY_ACC_NUMBER')?.trim() || '';
    const envAccountHolder =
      this.configService.get<string>('SEPAY_ACC_HOLDER')?.trim() || '';
    const envApiKey = this.configService.get<string>('SEPAY_API_KEY')?.trim() || '';
    const userApiToken =
      this.configService.get<string>('SEPAY_USER_API_TOKEN')?.trim() || '';
    const preferredBankAccountId =
      this.configService.get<string>('SEPAY_BANK_ACCOUNT_ID')?.trim() || '';

    let bankName = this.validSettingValue(
      envBankName,
      setting?.bankName,
      LEGACY_SEPAY_SETTINGS.bankName,
    );
    let accountNumber = this.validSettingValue(
      envAccountNumber,
      setting?.accountNumber,
      LEGACY_SEPAY_SETTINGS.accountNumber,
    );
    let accountHolder = this.validSettingValue(
      envAccountHolder,
      setting?.accountHolder,
      LEGACY_SEPAY_SETTINGS.accountHolder,
    );

    if (userApiToken) {
      const linkedAccount = await this.getLinkedBankAccount(
        userApiToken,
        preferredBankAccountId,
        envAccountNumber,
      );
      bankName = linkedAccount.bank_code || linkedAccount.bank_short_name || '';
      accountNumber = linkedAccount.account_number;
      accountHolder = linkedAccount.account_holder_name;
    }

    if (!setting) {
      setting = await this.settingModel.create({
        key: 'sepay',
        bankName,
        accountNumber,
        accountHolder,
        apiKey: envApiKey,
      });
    } else {
      const needsSave =
        setting.bankName !== bankName ||
        setting.accountNumber !== accountNumber ||
        setting.accountHolder !== accountHolder ||
        (envApiKey && setting.apiKey !== envApiKey);

      if (needsSave) {
        setting.bankName = bankName;
        setting.accountNumber = accountNumber;
        setting.accountHolder = accountHolder;
        if (envApiKey) {
          setting.apiKey = envApiKey;
        }
        await setting.save();
      }
    }
    return setting;
  }

  async updateSepaySettings(dto: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    apiKey?: string;
  }) {
    let setting = await this.settingModel.findOneAndUpdate(
      { key: 'sepay' },
      {
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        apiKey: dto.apiKey || '',
      },
      { upsert: true, new: true },
    );
    this.linkedAccountCache = undefined;
    return setting;
  }

  private validSettingValue(
    environmentValue: string,
    databaseValue: string | undefined,
    legacyValue: string,
  ) {
    if (environmentValue) {
      return environmentValue;
    }
    const normalizedDatabaseValue = databaseValue?.trim() || '';
    return normalizedDatabaseValue === legacyValue ? '' : normalizedDatabaseValue;
  }

  private async getLinkedBankAccount(
    apiKey: string,
    preferredBankAccountId: string,
    preferredAccountNumber: string,
  ) {
    const cacheKey = `${preferredBankAccountId}:${preferredAccountNumber}`;
    if (
      this.linkedAccountCache &&
      this.linkedAccountCache.cacheKey === cacheKey &&
      this.linkedAccountCache.expiresAt > Date.now()
    ) {
      return this.linkedAccountCache.account;
    }

    let response: Response;
    try {
      response = await fetch('https://my.sepay.vn/userapi/bankaccounts/list', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Unable to verify the linked SePay bank account',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Unable to verify the linked SePay bank account',
      );
    }

    const payload = (await response.json()) as SepayBankAccountsResponse;
    const activeAccounts = (payload.bankaccounts || []).filter(
      (account) => account.active === '1',
    );
    let account: SepayBankAccount | undefined;

    if (preferredBankAccountId) {
      account = activeAccounts.find(
        (candidate) => candidate.id === preferredBankAccountId,
      );
    } else if (preferredAccountNumber) {
      account = activeAccounts.find(
        (candidate) => candidate.account_number === preferredAccountNumber,
      );
    } else if (activeAccounts.length === 1) {
      account = activeAccounts[0];
    }

    if (!account) {
      const reason =
        activeAccounts.length > 1
          ? 'Multiple active SePay bank accounts found; configure SEPAY_BANK_ACCOUNT_ID'
          : 'No active linked SePay bank account found';
      throw new ServiceUnavailableException(reason);
    }

    this.linkedAccountCache = {
      cacheKey,
      expiresAt: Date.now() + SEPAY_ACCOUNT_CACHE_TTL_MS,
      account,
    };
    return account;
  }
}
