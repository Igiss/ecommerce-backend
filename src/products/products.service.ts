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
import { User, UserDocument } from '../database/schemas/user.schema';
import { UploadTargetType, UploadType } from '../database/schemas/upload.schema';
import { UploadService } from '../upload/upload.service';
import { InventoryLogsService } from '../inventory-logs/inventory-logs.service';
import { InventoryLogType } from '../database/schemas/inventory-log.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly categoriesService: CategoriesService,
    private readonly uploadService: UploadService,
    private readonly inventoryLogsService: InventoryLogsService,
    private readonly aiService: AiService,
  ) {}


  async onModuleInit() {
    await this.assignIdsToExistingProducts();
  }

  async create(createProductDto: CreateProductDto, createdBy: string) {
    await this.categoriesService.findOne(createProductDto.categoryId);

    const slug = createSlug(createProductDto.slug || createProductDto.name);
    await this.ensureSlugAvailable(slug);
    const productId = await this.getNextProductId();
    const productObjectId = new Types.ObjectId();
    const { imageUploadIds, ...productData } = createProductDto;
    const images = imageUploadIds
      ? await this.uploadService.attachUploads(
          createdBy,
          imageUploadIds,
          UploadType.ProductImage,
          UploadTargetType.Product,
          productObjectId,
        )
      : [];

    const product = await this.productModel.create({
      _id: productObjectId,
      ...productData,
      images,
      productId,
      slug,
      createdBy: new Types.ObjectId(createdBy),
    });

    // Tạo embedding ngầm định để tránh block response quá lâu
    this.aiService.generateEmbedding(`${productData.name}. ${productData.description || ''}`).then(embedding => {
      if (embedding.length > 0) {
        this.productModel.findByIdAndUpdate(productObjectId, { embedding }).exec();
      }
    }).catch(err => console.error('Lỗi khi tạo embedding:', err));

    if (productData.stock) {
      await this.inventoryLogsService.createLog(
        productObjectId,
        productData.stock,
        InventoryLogType.RESTOCK,
        undefined,
        'Initial stock',
      );
    }

    return product;
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(query);

    if (query.storeName) {
      const users = await this.userModel
        .find({
          $or: [
            { storeName: new RegExp(query.storeName, 'i') },
            { fullName: new RegExp(query.storeName, 'i') },
          ],
        })
        .select('_id')
        .exec();

      if (users.length === 0) {
        return {
          items: [],
          meta: buildPaginationMeta(0, page, limit),
        };
      }
      filter.createdBy = { $in: users.map((u) => u._id) };
    }

    const sortField = query.sortBy || 'createdAt';

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('categoryId', 'name slug')
        .populate('createdBy', 'fullName email storeName storePhone')
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

  async findAllByOwner(ownerId: string, query: ProductQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const filter = {
      ...this.buildFilter(query),
      createdBy: new Types.ObjectId(ownerId),
    };
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('categoryId', 'name slug')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async getInventoryLogsByOwner(ownerId: string, page: number = 1, limit: number = 10) {
    // 1. Get all products created by this owner
    const products = await this.productModel
      .find({ createdBy: new Types.ObjectId(ownerId) })
      .select('_id')
      .exec();
    
    if (products.length === 0) {
      return { items: [], meta: buildPaginationMeta(0, page, limit) };
    }

    const productIds = products.map((p) => p._id as Types.ObjectId);
    
    // 2. Get inventory logs for those products
    return this.inventoryLogsService.getLogsByProducts(productIds, page, limit);
  }

  async findOne(idOrSlug: number | string) {
    let query: any = { status: { $ne: ProductStatus.Deleted } };
    
    // Check if idOrSlug is a number (productId) or a string (slug)
    const isNumeric = !isNaN(Number(idOrSlug));
    if (isNumeric) {
      query.productId = Number(idOrSlug);
    } else {
      query.slug = idOrSlug;
    }

    const product = await this.productModel
      .findOne(query)
      .populate('categoryId', 'name slug')
      .populate('createdBy', 'fullName email storeName storePhone')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto, updatedBy: string) {
    const product = await this.findOne(id);
    const updatePayload: Record<string, unknown> = { ...updateProductDto };
    delete updatePayload.imageUploadIds;

    if (updateProductDto.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    const slugSource = updateProductDto.slug || updateProductDto.name;
    if (slugSource) {
      const slug = createSlug(slugSource);
      await this.ensureSlugAvailable(slug, product._id.toString());
      updatePayload.slug = slug;
    }

    if (updateProductDto.imageUploadIds) {
      updatePayload.images = await this.uploadService.attachUploads(
        updatedBy,
        updateProductDto.imageUploadIds,
        UploadType.ProductImage,
        UploadTargetType.Product,
        product._id,
      );
    }

    // Cập nhật lại embedding nếu thay đổi name hoặc description
    if (updateProductDto.name !== undefined || updateProductDto.description !== undefined) {
      const newName = updateProductDto.name ?? product.name;
      const newDesc = updateProductDto.description ?? product.description;
      this.aiService.generateEmbedding(`${newName}. ${newDesc || ''}`).then(embedding => {
        if (embedding.length > 0) {
          this.productModel.findByIdAndUpdate(product._id, { embedding }).exec();
        }
      }).catch(err => console.error('Lỗi cập nhật embedding:', err));
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(product._id, updatePayload, { new: true })
      .populate('categoryId', 'name slug')
      .populate('createdBy', 'fullName email storeName storePhone')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    if (updateProductDto.stock !== undefined && updateProductDto.stock !== product.stock) {
      const stockChange = updateProductDto.stock - product.stock;
      await this.inventoryLogsService.createLog(
        product._id,
        stockChange,
        InventoryLogType.UPDATE,
        undefined,
        'Admin updated stock',
      );
    }

    return updatedProduct;
  }

  async updateByOwner(id: number, ownerId: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel
      .findOne({
        productId: id,
        createdBy: new Types.ObjectId(ownerId),
        status: { $ne: ProductStatus.Deleted },
      })
      .exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const updatePayload: Record<string, unknown> = { ...updateProductDto };
    delete updatePayload.imageUploadIds;

    if (updateProductDto.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    const slugSource = updateProductDto.slug || updateProductDto.name;
    if (slugSource) {
      const slug = createSlug(slugSource);
      await this.ensureSlugAvailable(slug, product._id.toString());
      updatePayload.slug = slug;
    }

    if (updateProductDto.imageUploadIds) {
      updatePayload.images = await this.uploadService.attachUploads(
        ownerId,
        updateProductDto.imageUploadIds,
        UploadType.ProductImage,
        UploadTargetType.Product,
        product._id,
      );
    }

    // Cập nhật lại embedding nếu thay đổi name hoặc description
    if (updateProductDto.name !== undefined || updateProductDto.description !== undefined) {
      const newName = updateProductDto.name ?? product.name;
      const newDesc = updateProductDto.description ?? product.description;
      this.aiService.generateEmbedding(`${newName}. ${newDesc || ''}`).then(embedding => {
        if (embedding.length > 0) {
          this.productModel.findByIdAndUpdate(product._id, { embedding }).exec();
        }
      }).catch(err => console.error('Lỗi cập nhật embedding:', err));
    }

    const updatedProduct = await this.productModel
      .findOneAndUpdate(
        { _id: product._id, createdBy: new Types.ObjectId(ownerId) },
        updatePayload,
        { new: true },
      )
      .populate('categoryId', 'name slug')
      .exec();

    if (updateProductDto.stock !== undefined && updateProductDto.stock !== product.stock && updatedProduct) {
      const stockChange = updateProductDto.stock - product.stock;
      await this.inventoryLogsService.createLog(
        product._id,
        stockChange,
        InventoryLogType.UPDATE,
        undefined,
        'Owner updated stock',
      );
    }

    return updatedProduct;
  }

  async remove(id: number) {
    const product = await this.productModel
      .findOneAndUpdate(
        { productId: id },
        { status: ProductStatus.Deleted, deletedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async removeByOwner(id: number, ownerId: string) {
    const product = await this.productModel
      .findOneAndUpdate(
        { productId: id, createdBy: new Types.ObjectId(ownerId) },
        { status: ProductStatus.Deleted, deletedAt: new Date() },
        { new: true },
      )
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

  async suggestProducts(queryText: string) {
    if (!queryText || queryText.trim().length < 2) return [];

    const embedding = await this.aiService.generateEmbedding(queryText);
    if (embedding.length > 0) {
      // Dùng Vector Search của MongoDB Atlas
      try {
        const results = await this.productModel.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: embedding,
              numCandidates: 100,
              limit: 5
            }
          },
          {
            $match: { status: ProductStatus.Active }
          },
          {
            $project: {
              _id: 1,
              productId: 1,
              name: 1,
              slug: 1,
              price: 1,
              images: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]).exec();
        
        if (results && results.length > 0) {
          return results.map(p => ({ ...p, id: p.productId }));
        }
      } catch (err) {
        console.error('Vector search failed, falling back to text search:', (err as Error).message);
      }
    }

    // Fallback: Text search
    const filter: FilterQuery<ProductDocument> = {
      status: ProductStatus.Active,
      $text: { $search: queryText }
    };
    const fallbackResults = await this.productModel.find(filter)
      .limit(5)
      .select('_id productId name slug price images')
      .lean()
      .exec();
      
    return fallbackResults.map(p => ({ ...p, id: p.productId }));
  }

  private buildFilter(query: ProductQueryDto) {
    const filter: FilterQuery<ProductDocument> = {};

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }

    if (query.ownerId) {
      filter.createdBy = new Types.ObjectId(query.ownerId);
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
