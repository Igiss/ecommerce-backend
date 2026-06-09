import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { CustomDesign, CustomDesignDocument } from '../database/schemas/custom-design.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { CreateCustomDesignDto } from './dto/create-custom-design.dto';
import { UpdateCustomDesignStatusDto } from './dto/update-custom-design-status.dto';

@Injectable()
export class CustomDesignsService {
  constructor(
    @InjectModel(CustomDesign.name) private readonly customDesignModel: Model<CustomDesignDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(userId: string, dto: CreateCustomDesignDto) {
    let productObjectId: Types.ObjectId | undefined;

    if (dto.productId) {
      const product = await this.productModel.findOne({ productId: dto.productId }).exec();
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      productObjectId = product._id;
    }

    return this.customDesignModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      productId: productObjectId,
      uploadedFiles: dto.uploadedFiles?.map((id) => new Types.ObjectId(id)) || [],
    });
  }

  async findMine(userId: string) {
    return this.customDesignModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findAll() {
    return this.customDesignModel
      .find()
      .populate('userId', 'fullName email phone')
      .populate('productId', 'name slug productType')
      .populate('uploadedFiles')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string, role: Role) {
    const design = await this.customDesignModel
      .findById(id)
      .populate('uploadedFiles')
      .exec();

    if (!design) {
      throw new NotFoundException('Custom design not found');
    }

    if (role === Role.User && design.userId.toString() !== userId) {
      throw new ForbiddenException('You can only view your own custom designs');
    }

    return design;
  }

  async updateStatus(id: string, dto: UpdateCustomDesignStatusDto) {
    const design = await this.customDesignModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!design) {
      throw new NotFoundException('Custom design not found');
    }

    return design;
  }
}
