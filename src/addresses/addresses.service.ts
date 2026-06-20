import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Counter, CounterDocument } from '../database/schemas/counter.schema';
import {
  UserAddress,
  UserAddressDocument,
} from '../database/schemas/user-address.schema';
import { ShippingUnitsService } from '../shipping-units/shipping-units.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(UserAddress.name)
    private readonly addressModel: Model<UserAddressDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
    private readonly shippingUnitsService: ShippingUnitsService,
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

    const address = await this.addressModel.create({
      ...dto,
      addressId: await this.getNextAddressId(),
      userId: ownerId,
      isDefault,
    });

    // Kiểm tra phủ sóng nếu là địa chỉ mặc định
    const coverageWarning = isDefault
      ? await this.buildCoverageWarning(dto.province, dto.ward)
      : null;

    return { address, coverageWarning };
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
    const address = await existing.save();

    // Kiểm tra phủ sóng nếu update thành mặc định hoặc update ward/province của địa chỉ mặc định
    const isDefault = dto.isDefault || existing.isDefault;
    const province = dto.province ?? existing.province;
    const ward = dto.ward ?? existing.ward;
    const coverageWarning = isDefault
      ? await this.buildCoverageWarning(province, ward)
      : null;

    return { address, coverageWarning };
  }

  async setDefault(userId: string, addressId: number) {
    const ownerId = new Types.ObjectId(userId);
    const address = await this.addressModel.findOne({ addressId, userId: ownerId }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.addressModel.updateMany({ userId: ownerId }, { isDefault: false }).exec();
    address.isDefault = true;
    await address.save();

    // Kiểm tra phủ sóng phường/xã mới được set mặc định
    const coverageWarning = await this.buildCoverageWarning(address.province, address.ward);

    return { address, coverageWarning };
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

  /**
   * Kiểm tra xem khu vực (tỉnh, phường/xã) có ShippingUnit phụ trách không.
   * Trả về null nếu có đơn vị phụ trách, trả về chuỗi cảnh báo nếu chưa có.
   */
  async checkCoverageByArea(province: string, ward: string): Promise<{ covered: boolean; message: string | null }> {
    const unit = await this.shippingUnitsService.findUnitByArea(province, ward);
    if (unit) {
      return { covered: true, message: null };
    }
    return {
      covered: false,
      message: `Khu vực "${ward}, ${province}" hiện chưa có đơn vị vận chuyển phụ trách. Đơn hàng đến địa chỉ này có thể không được giao tự động — admin sẽ xử lý thủ công.`,
    };
  }

  private async buildCoverageWarning(province: string, ward: string): Promise<string | null> {
    const { message } = await this.checkCoverageByArea(province, ward);
    return message;
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
