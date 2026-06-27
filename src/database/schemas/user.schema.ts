import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;
export type UserStatus = 'pending' | 'active' | 'blocked';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ enum: Role, default: Role.User })
  role: Role;

  @Prop({ enum: ['pending', 'active', 'blocked'], default: 'active' })
  status: UserStatus;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  blockedAt?: Date;

  @Prop({ trim: true })
  blockedReason?: string;

  @Prop({ type: String, default: '' })
  address: string;

  // --- Owner specific fields ---
  @Prop({ default: false })
  isRequestingOwner: boolean;

  @Prop({ trim: true })
  storeName?: string;

  @Prop({ trim: true })
  storePhone?: string;

  @Prop({ type: String })
  storeAddress?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ storeName: 1 });

UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    delete transformed.password;
    return ret;
  },
});
