import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { ShippingUnit, ShippingUnitDocument } from '../database/schemas/shipping-unit.schema';
import { ShipperProfile, ShipperProfileDocument } from '../database/schemas/shipper-profile.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { UpdateShippingUnitDto } from './dto/update-shipping-unit.dto';
import { UpdateCoverageDto } from './dto/update-coverage.dto';
import { CreateShipperDto } from './dto/create-shipper.dto';
import { UpdateShipperDto } from './dto/update-shipper.dto';

@Injectable()
export class ShippingUnitsService {
  constructor(
    @InjectModel(ShippingUnit.name) private readonly shippingUnitModel: Model<ShippingUnitDocument>,
    @InjectModel(ShipperProfile.name) private readonly shipperProfileModel: Model<ShipperProfileDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── Admin: quản lý ShippingUnit ───────────────────────────────────────────

  /** [Admin] Lấy danh sách tất cả đơn vị vận chuyển */
  async findAll() {
    return this.shippingUnitModel
      .find()
      .populate('userId', 'fullName email phone status')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** [Admin] Cập nhật danh sách phường/xã phủ sóng */
  async updateCoverage(shippingUnitUserId: string, dto: UpdateCoverageDto) {
    const unit = await this.shippingUnitModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(shippingUnitUserId) },
        { coverageWards: dto.coverageWards },
        { new: true },
      )
      .exec();

    if (!unit) {
      throw new NotFoundException('ShippingUnit not found');
    }
    return unit;
  }

  // ─── ShippingUnit: quản lý profile mình ────────────────────────────────────

  /** [ShippingUnit] Xem profile của đơn vị mình */
  async findMyProfile(userId: string) {
    const unit = await this.shippingUnitModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!unit) {
      throw new NotFoundException('ShippingUnit profile not found');
    }
    return unit;
  }

  /** [ShippingUnit] Cập nhật thông tin công ty */
  async updateMyProfile(userId: string, dto: UpdateShippingUnitDto) {
    const unit = await this.shippingUnitModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();

    if (!unit) {
      throw new NotFoundException('ShippingUnit profile not found');
    }
    return unit;
  }

  // ─── ShippingUnit: quản lý Shipper ─────────────────────────────────────────

  /** [ShippingUnit] Tạo tài khoản Shipper mới thuộc đơn vị mình */
  async createShipper(shippingUnitUserId: string, dto: CreateShipperDto) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const password = await bcrypt.hash(dto.password, 10);
    const shipper = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      password,
      phone: dto.phone,
      role: Role.Shipper,
      status: 'active',
      address: dto.address,
    });

    await this.shipperProfileModel.create({
      userId: shipper._id,
      shippingUnitId: new Types.ObjectId(shippingUnitUserId),
      vehicleType: dto.vehicleType,
      licensePlate: dto.licensePlate,
      coverageWard: dto.coverageWard,
    });

    const { password: _pw, ...publicShipper } = shipper.toJSON() as Record<string, unknown>;
    return publicShipper;
  }

  /** [ShippingUnit] Danh sách Shipper thuộc đơn vị mình */
  async findShippersByUnit(shippingUnitUserId: string) {
    return this.shipperProfileModel
      .find({ shippingUnitId: new Types.ObjectId(shippingUnitUserId) })
      .populate('userId', 'fullName email phone status')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** [ShippingUnit] Chi tiết một Shipper — verify thuộc đơn vị mình */
  async findShipperById(shipperId: string, shippingUnitUserId: string) {
    const profile = await this.shipperProfileModel
      .findOne({
        userId: new Types.ObjectId(shipperId),
        shippingUnitId: new Types.ObjectId(shippingUnitUserId),
      })
      .populate('userId', 'fullName email phone status')
      .exec();

    if (!profile) {
      throw new NotFoundException('Shipper not found or does not belong to your unit');
    }
    return profile;
  }

  /** [ShippingUnit] Toggle trạng thái sẵn sàng của Shipper */
  async updateShipperAvailability(shipperId: string, shippingUnitUserId: string, isAvailable: boolean) {
    const profile = await this.shipperProfileModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(shipperId),
          shippingUnitId: new Types.ObjectId(shippingUnitUserId),
        },
        { isAvailable },
        { new: true },
      )
      .exec();

    if (!profile) {
      throw new NotFoundException('Shipper not found or does not belong to your unit');
    }
    return profile;
  }

  /** [ShippingUnit] Cập nhật thông tin Shipper (address, phone, coverageWard...) */
  async updateShipperProfile(shipperId: string, shippingUnitUserId: string, dto: UpdateShipperDto) {
    // Verify shipper thuộc đơn vị
    const profile = await this.shipperProfileModel.findOne({
      userId: new Types.ObjectId(shipperId),
      shippingUnitId: new Types.ObjectId(shippingUnitUserId),
    }).exec();

    if (!profile) {
      throw new NotFoundException('Shipper not found or does not belong to your unit');
    }

    // Tách các trường thuộc User vs ShipperProfile
    const { fullName, phone, address, vehicleType, licensePlate, coverageWard } = dto;

    // Cập nhật User fields (fullName, phone, address)
    const userUpdate: Record<string, unknown> = {};
    if (fullName !== undefined) userUpdate.fullName = fullName;
    if (phone !== undefined) userUpdate.phone = phone;
    if (address !== undefined) userUpdate.address = address;

    if (Object.keys(userUpdate).length > 0) {
      await this.userModel.findByIdAndUpdate(shipperId, userUpdate).exec();
    }

    // Cập nhật ShipperProfile fields (vehicleType, licensePlate, coverageWard)
    const profileUpdate: Record<string, unknown> = {};
    if (vehicleType !== undefined) profileUpdate.vehicleType = vehicleType;
    if (licensePlate !== undefined) profileUpdate.licensePlate = licensePlate;
    if (coverageWard !== undefined) profileUpdate.coverageWard = coverageWard;

    if (Object.keys(profileUpdate).length > 0) {
      Object.assign(profile, profileUpdate);
      await profile.save();
    }

    // Trả về profile đã populate user info
    return this.shipperProfileModel
      .findById(profile._id)
      .populate('userId', 'fullName email phone status address')
      .exec();
  }

  // ─── ShippingUnit: quản lý đơn hàng ────────────────────────────────────────

  /** [ShippingUnit] Lấy đơn hàng được phân cho đơn vị mình */
  async findOrdersByUnit(shippingUnitUserId: string) {
    return this.orderModel
      .find({
        shippingUnitId: new Types.ObjectId(shippingUnitUserId),
        orderStatus: { $in: [OrderStatus.Assigned, OrderStatus.Shipping, OrderStatus.Completed] },
      })
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** [ShippingUnit] Chi tiết đơn hàng — verify thuộc đơn vị mình */
  async findOrderByIdForUnit(orderId: string, shippingUnitUserId: string) {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shippingUnitId: new Types.ObjectId(shippingUnitUserId),
      })
      .populate('userId', 'fullName email phone')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to your unit');
    }
    return order;
  }

  /** [ShippingUnit] Phân đơn cho Shipper — verify shipper thuộc đơn vị mình */
  async assignShipper(orderId: string, shippingUnitUserId: string, shipperId: string) {
    // Verify shipper thuộc đơn vị
    const shipperProfile = await this.shipperProfileModel.findOne({
      userId: new Types.ObjectId(shipperId),
      shippingUnitId: new Types.ObjectId(shippingUnitUserId),
    }).exec();

    if (!shipperProfile) {
      throw new ForbiddenException('Shipper does not belong to your unit');
    }

    const order = await this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          shippingUnitId: new Types.ObjectId(shippingUnitUserId),
          orderStatus: OrderStatus.Assigned,
        },
        { shipperId: new Types.ObjectId(shipperId) },
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found or not in assigned status');
    }
    return order;
  }

  // ─── Utility: tự động phân đơn theo phường/xã ─────────────────────────────

  /**
   * Tìm ShippingUnit phụ trách phường/xã của đơn hàng.
   * Dùng khi admin confirm đơn → tự động gán shippingUnitId.
   */
  async findUnitByWard(ward: string): Promise<ShippingUnitDocument | null> {
    return this.shippingUnitModel
      .findOne({ coverageWards: ward })
      .exec();
  }

  /**
   * Tự động phân Shipper theo phường/xã (round-robin).
   *
   * Logic:
   * 1. Tìm tất cả Shipper thuộc đơn vị, phụ trách ward, đang sẵn sàng
   * 2. Sort theo lastAssignedAt tăng dần (null first → shipper chưa nhận đơn nào)
   * 3. Chọn shipper đầu tiên → cập nhật lastAssignedAt
   * 4. Trả về userId của shipper để gán vào đơn hàng
   *
   * @returns { shipperId, shipperName } hoặc null nếu không có shipper phù hợp
   */
  async autoAssignShipperByWard(
    ward: string,
    shippingUnitUserId: string,
  ): Promise<{ shipperId: Types.ObjectId; shipperName: string } | null> {
    // Tìm shipper có lastAssignedAt cũ nhất (hoặc null) → round-robin
    const profile = await this.shipperProfileModel
      .findOne({
        shippingUnitId: new Types.ObjectId(shippingUnitUserId),
        coverageWard: ward,
        isAvailable: true,
      })
      .sort({ lastAssignedAt: 1 })  // null first, then oldest
      .populate('userId', 'fullName')
      .exec();

    if (!profile) {
      return null;
    }

    // Đánh dấu đã phân đơn cho shipper này (round-robin timestamp)
    profile.lastAssignedAt = new Date();
    await profile.save();

    const user = profile.userId as unknown as { _id: Types.ObjectId; fullName: string };
    return {
      shipperId: user._id,
      shipperName: user.fullName,
    };
  }
}
