import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNotFoundResponse,
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
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Owner)
@Controller('owner/products')
export class OwnerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: '[Owner] Lấy sản phẩm do owner hiện tại tạo',
    description: 'createdBy luôn được lấy từ user ID trong JWT.',
  })
  getProducts(@CurrentUser() user: JwtPayload, @Query() query: ProductQueryDto) {
    return this.productsService.findAllByOwner(user.sub, query);
  }

  @Post()
  @ApiOperation({
    summary: '[Owner] Tạo sản phẩm cho shop hiện tại',
    description: 'Backend tự gán createdBy từ JWT; frontend không được chọn owner.',
  })
  createProduct(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '[Owner] Cập nhật sản phẩm thuộc shop hiện tại',
    description: 'Trả về 404 nếu sản phẩm thuộc owner khác.',
  })
  @ApiParam({ name: 'id', description: 'ID số của sản phẩm' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm thuộc owner hiện tại' })
  updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateByOwner(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Owner] Xóa mềm sản phẩm thuộc shop hiện tại',
    description: 'Không thể xóa sản phẩm do owner khác tạo.',
  })
  @ApiParam({ name: 'id', description: 'ID số của sản phẩm' })
  deleteProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParsePositiveIntPipe) id: number,
  ) {
    return this.productsService.removeByOwner(id, user.sub);
  }
}
