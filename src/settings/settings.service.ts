import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from '../database/schemas/setting.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name)
    private readonly settingModel: Model<SettingDocument>,
  ) {}

  async getSepaySettings() {
    let setting = await this.settingModel.findOne({ key: 'sepay' }).exec();
    if (!setting) {
      setting = await this.settingModel.create({
        key: 'sepay',
        bankName: process.env.SEPAY_BANK_NAME || '',
        accountNumber: process.env.SEPAY_ACC_NUMBER || '',
        accountHolder: process.env.SEPAY_ACC_HOLDER || '',
        apiKey: process.env.SEPAY_API_KEY || '',
      });
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
    return setting;
  }
}
