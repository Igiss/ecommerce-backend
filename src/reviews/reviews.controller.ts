import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ReviewsService } from './reviews.service';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[User] Đánh giá sản phẩm trong đơn đã hoàn tất, mỗi đơn một lần',
  })
  @ApiBadRequestResponse({
    description: 'Đơn chưa hoàn tất hoặc sản phẩm không thuộc đơn hàng',
  })
  @ApiConflictResponse({
    description: 'Sản phẩm trong đơn hàng này đã được đánh giá',
  })
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.sub, dto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: '[Public] Lấy danh sách review theo sản phẩm' })
  @ApiParam({ name: 'productId', type: Number, example: 1, description: 'ID số của sản phẩm' })
  findByProduct(@Param('productId', ParsePositiveIntPipe) productId: number) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('product/:productId/summary')
  @ApiOperation({ summary: '[Public] Lấy điểm đánh giá tổng hợp của sản phẩm' })
  @ApiParam({ name: 'productId', type: Number, example: 1, description: 'ID số của sản phẩm' })
  @ApiOkResponse({
    schema: {
      example: {
        productId: 1,
        averageRating: 4.25,
        totalReviews: 12,
        distribution: { 1: 0, 2: 1, 3: 2, 4: 2, 5: 7 },
      },
    },
  })
  getRatingSummary(@Param('productId', ParsePositiveIntPipe) productId: number) {
    return this.reviewsService.getRatingSummary(productId);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Lấy toàn bộ đánh giá để duyệt' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findAllForAdmin() {
    return this.reviewsService.findAllForAdmin();
  }

  @Patch(':id/moderation')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Kiểm duyệt và ẩn/hiện review' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  moderate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, user.sub, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Owner] Cập nhật review của chính mình' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của review' })
  @ApiBadRequestResponse({ description: 'ID review không hợp lệ' })
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Owner/Admin] Xóa mềm review' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của review' })
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseMongoIdPipe) id: string) {
    return this.reviewsService.remove(id, user.sub, user.role);
  }
}
