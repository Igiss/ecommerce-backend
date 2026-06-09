import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Owner] Tạo danh mục sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '[Public] Lấy danh sách danh mục sản phẩm' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  findAll(@Query('status') status?: string) {
    return this.categoriesService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Public] Xem chi tiết danh mục' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của danh mục' })
  @ApiBadRequestResponse({ description: 'ID danh mục không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật danh mục sản phẩm' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của danh mục' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Owner] Vô hiệu hóa danh mục sản phẩm' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của danh mục' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
