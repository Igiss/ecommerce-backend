import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { User, UserDocument } from '../database/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { UploadTargetType, UploadType } from '../database/schemas/upload.schema';
import { UploadService } from '../upload/upload.service';

type PublicUser = User & { id?: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const user = await this.userModel.create(createUserDto);
    return this.toPublicUser(user);
  }

  async findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByIdWithPassword(id: string) {
    return this.userModel.findById(id).select('+password').exec();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
    avatar?: string;
  }) {
    let user = await this.userModel.findOne({ googleId: profile.googleId }).exec();
    if (user) {
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
        await user.save();
      }
      return user;
    }

    user = await this.userModel.findOne({ email: profile.email.toLowerCase() }).exec();
    if (user) {
      user.googleId = profile.googleId;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      if (!user.avatar && profile.avatar) {
        user.avatar = profile.avatar;
      }
      return user.save();
    }

    const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    return this.userModel.create({
      ...profile,
      email: profile.email.toLowerCase(),
      password,
      emailVerifiedAt: new Date(),
    });
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    const { avatarUploadId, ...profileFields } = updateProfileDto;
    const profileData: Record<string, unknown> = profileFields;
    if (avatarUploadId) {
      const [avatar] = await this.uploadService.attachUploads(
        id,
        [avatarUploadId],
        UploadType.Avatar,
        UploadTargetType.User,
        new Types.ObjectId(id),
      );
      profileData.avatar = avatar;
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, profileData, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async requestOwner(id: string, storeName: string, storePhone: string, storeAddress: string) {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          isRequestingOwner: true,
          storeName,
          storePhone,
          storeAddress,
        },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { message: 'Yêu cầu đăng ký Kênh Người Bán đã được gửi thành công' };
  }

  async getPendingOwners() {
    return this.userModel
      .find({ isRequestingOwner: true, role: Role.User })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    const isBlocked = updateUserStatusDto.status === 'blocked';
    const update = isBlocked
      ? {
          $set: {
            status: updateUserStatusDto.status,
            blockedAt: new Date(),
            blockedReason: updateUserStatusDto.blockedReason,
          },
        }
      : {
          $set: { status: updateUserStatusDto.status },
          $unset: { blockedAt: 1, blockedReason: 1 },
        };
    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRole(id: string, updateUserRoleDto: UpdateUserRoleDto) {
    const updateData: any = { role: updateUserRoleDto.role };
    if (updateUserRoleDto.role === Role.Owner) {
      updateData.isRequestingOwner = false;
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updatePassword(id: string, password: string) {
    const user = await this.userModel.findByIdAndUpdate(id, { password }, { new: true }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return true;
  }

  async recordLogin(id: string) {
    await this.userModel.updateOne({ _id: id }, { lastLoginAt: new Date() }).exec();
  }
  toPublicUser(user: UserDocument | User): PublicUser {
    const plainUser = typeof (user as UserDocument).toJSON === 'function'
      ? (user as UserDocument).toJSON()
      : user;

    delete (plainUser as Partial<User>).password;
    return plainUser as PublicUser;
  }
}
