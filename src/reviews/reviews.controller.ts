import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '[User] Đánh giá sản phẩm đã mua trong đơn hàng' })
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
