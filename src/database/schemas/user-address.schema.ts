import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserAddressDocument = HydratedDocument<UserAddress>;

@Schema({ timestamps: true })
export class UserAddress {
  @Prop({ required: true, unique: true, min: 1 })
  addressId: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  addressLine: string;

  @Prop({ trim: true, default: '' })
  ward: string;

  @Prop({ required: true, trim: true })
  province: string;

  @Prop({ trim: true, default: '' })
  postalCode: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const UserAddressSchema = SchemaFactory.createForClass(UserAddress);

UserAddressSchema.index({ userId: 1, isDefault: 1 });
UserAddressSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    transformed.id = transformed.addressId;
    delete transformed._id;
    delete transformed.addressId;
    delete transformed.userId;
    return ret;
  },
});
