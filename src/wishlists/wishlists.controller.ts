import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { WishlistsService } from './wishlists.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Request } from 'express';

@ApiTags('Wishlists (Sản phẩm yêu thích)')
@Controller('wishlists')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get('my')
  @Roles(Role.User)
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm yêu thích của tôi' })
  getMyWishlist(@Req() req: Request) {
    const userId = (req.user as any)['sub'];
    return this.wishlistsService.getWishlist(userId);
  }

  @Post()
  @Roles(Role.User)
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  addToWishlist(@Req() req: Request, @Body() dto: AddWishlistItemDto) {
    const userId = (req.user as any)['sub'];
    return this.wishlistsService.addToWishlist(userId, dto);
  }

  @Delete(':productId')
  @Roles(Role.User)
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  removeFromWishlist(@Req() req: Request, @Param('productId') productId: string) {
    const userId = (req.user as any)['sub'];
    return this.wishlistsService.removeFromWishlist(userId, productId);
  }
}
