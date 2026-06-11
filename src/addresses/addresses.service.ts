import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Counter, CounterDocument } from '../database/schemas/counter.schema';
import {
  UserAddress,
  UserAddressDocument,
} from '../database/schemas/user-address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(UserAddress.name)
    private readonly addressModel: Model<UserAddressDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  findAll(userId: string) {
    return this.addressModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async create(userId: string, dto: CreateAddressDto) {
    const ownerId = new Types.ObjectId(userId);
    const hasAddress = await this.addressModel.exists({ userId: ownerId });
    const isDefault = dto.isDefault || !hasAddress;

    if (isDefault) {
      await this.addressModel.updateMany({ userId: ownerId }, { isDefault: false }).exec();
    }

    return this.addressModel.create({
      ...dto,
      addressId: await this.getNextAddressId(),
      userId: ownerId,
      isDefault,
    });
  }

  async update(userId: string, addressId: number, dto: UpdateAddressDto) {
    const ownerId = new Types.ObjectId(userId);
    const existing = await this.addressModel.findOne({ addressId, userId: ownerId }).exec();
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault) {
      await this.addressModel
        .updateMany({ userId: ownerId, addressId: { $ne: addressId } }, { isDefault: false })
        .exec();
    }

    Object.assign(existing, dto);
    return existing.save();
  }

  async setDefault(userId: string, addressId: number) {
    const ownerId = new Types.ObjectId(userId);
    const address = await this.addressModel.findOne({ addressId, userId: ownerId }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.addressModel.updateMany({ userId: ownerId }, { isDefault: false }).exec();
    address.isDefault = true;
    return address.save();
  }

  async remove(userId: string, addressId: number) {
    const ownerId = new Types.ObjectId(userId);
    const address = await this.addressModel
      .findOneAndDelete({ addressId, userId: ownerId })
      .exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.isDefault) {
      await this.addressModel
        .findOneAndUpdate(
          { userId: ownerId },
          { isDefault: true },
          { sort: { createdAt: -1 } },
        )
        .exec();
    }

    return { message: 'Address deleted successfully' };
  }

  private async getNextAddressId() {
    const counter = await this.counterModel
      .findByIdAndUpdate(
        'user-address',
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return counter.sequence;
  }
}
