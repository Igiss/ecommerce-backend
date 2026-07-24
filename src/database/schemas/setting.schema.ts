import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingDocument = HydratedDocument<Setting>;

@Schema({ timestamps: true })
export class Setting {
  @Prop({ required: true, unique: true, default: 'sepay' })
  key: string;

  @Prop({ required: true, trim: true, default: 'MBBank' })
  bankName: string;

  @Prop({ required: true, trim: true, default: '03888888888' })
  accountNumber: string;

  @Prop({ required: true, trim: true, default: 'GIA DUNG 24H' })
  accountHolder: string;

  @Prop({ trim: true, default: '' })
  apiKey?: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
