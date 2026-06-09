import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { CartService } from './cart.service';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '[User] Lấy giỏ hàng của tài khoản đang đăng nhập' })
  getCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(user.sub);
  }

  @Post('items')
  @ApiOperation({ summary: '[User] Thêm sản phẩm vào giỏ hàng' })
  addItem(@CurrentUser() user: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.sub, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: '[User] Cập nhật số lượng sản phẩm trong giỏ hàng' })
  @ApiParam({ name: 'productId', type: Number, example: 1, description: 'ID số của sản phẩm' })
  @ApiBadRequestResponse({ description: 'productId phải là số nguyên dương' })
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParsePositiveIntPipe) productId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.sub, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: '[User] Xóa một sản phẩm khỏi giỏ hàng' })
  @ApiParam({ name: 'productId', type: Number, example: 1, description: 'ID số của sản phẩm' })
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParsePositiveIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(user.sub, productId);
  }

  @Delete()
  @ApiOperation({ summary: '[User] Xóa toàn bộ giỏ hàng' })
  clearCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.clearCart(user.sub);
  }
}
