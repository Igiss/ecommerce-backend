import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { User, UserDocument } from '../database/schemas/user.schema';

type PublicUser = User & { id?: string };

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

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

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateProfileDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { status: updateUserStatusDto.status }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRole(id: string, updateUserRoleDto: UpdateUserRoleDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { role: updateUserRoleDto.role }, { new: true })
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

  toPublicUser(user: UserDocument | User): PublicUser {
    const plainUser = typeof (user as UserDocument).toJSON === 'function'
      ? (user as UserDocument).toJSON()
      : user;

    delete (plainUser as Partial<User>).password;
    return plainUser as PublicUser;
  }
}
