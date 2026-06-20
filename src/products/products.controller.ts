import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Owner] Tạo sản phẩm mới' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiCreatedResponse({ description: 'Sản phẩm đã được tạo với ID số tuần tự' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: '[Public] Lấy danh sách sản phẩm, tìm kiếm, lọc, phân trang, sắp xếp' })
  @ApiOkResponse({
    description: 'Danh sách sản phẩm có phân trang',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'object' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: '[Public] Xem chi tiết sản phẩm' })
  @ApiParam({
    name: 'idOrSlug',
    description: 'ID số của sản phẩm hoặc slug',
    example: '1',
    schema: { type: 'string' },
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'ID số của sản phẩm' })
  @ApiBadRequestResponse({ description: 'ID phải là số nguyên dương' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  update(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Owner] Xóa mềm sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'ID số của sản phẩm' })
  @ApiBadRequestResponse({ description: 'ID phải là số nguyên dương' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  remove(@Param('id', ParsePositiveIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
