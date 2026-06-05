import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { createSlug } from '../common/helpers/slug.helper';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from '../database/schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const slug = createSlug(createCategoryDto.slug || createCategoryDto.name);
    await this.ensureSlugAvailable(slug);

    return this.categoryModel.create({
      ...createCategoryDto,
      slug,
    });
  }

  async findAll(status?: string) {
    const filter: FilterQuery<CategoryDocument> = {};
    if (status) {
      filter.status = status;
    }

    return this.categoryModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    const slugSource = updateCategoryDto.slug || updateCategoryDto.name;

    if (slugSource) {
      const slug = createSlug(slugSource);
      await this.ensureSlugAvailable(slug, category.id);
      updateCategoryDto.slug = slug;
    }

    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .exec();

    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }

    return updatedCategory;
  }

  async remove(id: string) {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { status: 'inactive' }, { new: true })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async ensureSlugAvailable(slug: string, ignoreId?: string) {
    const existingCategory = await this.categoryModel.findOne({ slug }).exec();
    if (existingCategory && existingCategory.id !== ignoreId) {
      throw new BadRequestException('Category slug already exists');
    }
  }
}
