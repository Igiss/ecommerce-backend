import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { buildPaginationMeta, getPagination } from '../common/helpers/pagination.helper';
import { createSlug } from '../common/helpers/slug.helper';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument, ProductStatus } from '../database/schemas/product.schema';
import { Counter, CounterDocument } from '../database/schemas/counter.schema';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async onModuleInit() {
    await this.assignIdsToExistingProducts();
  }

  async create(createProductDto: CreateProductDto, createdBy: string) {
    await this.categoriesService.findOne(createProductDto.categoryId);

    const slug = createSlug(createProductDto.slug || createProductDto.name);
    await this.ensureSlugAvailable(slug);
    const productId = await this.getNextProductId();

    return this.productModel.create({
      ...createProductDto,
      productId,
      slug,
      createdBy: new Types.ObjectId(createdBy),
    });
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(query);
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('categoryId', 'name slug')
        .populate('createdBy', 'fullName email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: number) {
    const product = await this.productModel
      .findOne({ productId: id, status: { $ne: ProductStatus.Deleted } })
      .populate('categoryId', 'name slug')
      .populate('createdBy', 'fullName email')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (updateProductDto.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    const slugSource = updateProductDto.slug || updateProductDto.name;
    if (slugSource) {
      const slug = createSlug(slugSource);
      await this.ensureSlugAvailable(slug, product._id.toString());
      updateProductDto.slug = slug;
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(product._id, updateProductDto, { new: true })
      .populate('categoryId', 'name slug')
      .populate('createdBy', 'fullName email')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async remove(id: number) {
    const product = await this.productModel
      .findOneAndUpdate({ productId: id }, { status: ProductStatus.Deleted }, { new: true })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  searchForAssistant(search: string) {
    const terms = search.trim();
    const filter: FilterQuery<ProductDocument> = {
      status: ProductStatus.Active,
    };
    if (terms) {
      filter.$text = { $search: terms };
    }

    return this.productModel.find(filter).limit(10).exec();
  }

  private buildFilter(query: ProductQueryDto) {
    const filter: FilterQuery<ProductDocument> = {};

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }

    if (query.brand) {
      filter.brand = new RegExp(query.brand, 'i');
    }

    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: ProductStatus.Deleted };
    }

    if (query.productType) {
      filter.productType = query.productType;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) {
        filter.price.$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        filter.price.$lte = query.maxPrice;
      }
    }

    return filter;
  }

  private async ensureSlugAvailable(slug: string, ignoreId?: string) {
    const existingProduct = await this.productModel.findOne({ slug }).exec();
    if (existingProduct && existingProduct.id !== ignoreId) {
      throw new BadRequestException('Product slug already exists');
    }
  }

  private async getNextProductId() {
    const counter = await this.counterModel
      .findByIdAndUpdate(
        'product',
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return counter.sequence;
  }

  private async assignIdsToExistingProducts() {
    const highestProduct = await this.productModel
      .findOne({ productId: { $exists: true } })
      .sort({ productId: -1 })
      .select('productId')
      .lean()
      .exec();

    await this.counterModel
      .findByIdAndUpdate(
        'product',
        { $max: { sequence: highestProduct?.productId || 0 } },
        { upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    const productsWithoutId = await this.productModel
      .find({ productId: { $exists: false } })
      .sort({ createdAt: 1, _id: 1 })
      .select('_id')
      .exec();

    for (const product of productsWithoutId) {
      const productId = await this.getNextProductId();
      await this.productModel.updateOne({ _id: product._id }, { productId }).exec();
    }
  }
}
