import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadSignatureDto } from './dto/create-upload-signature.dto';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('signature')
  @ApiOperation({
    summary: 'Buoc 1 - Lay chu ky upload Cloudinary',
    description: [
      '1. Goi endpoint nay voi metadata file.',
      '2. FE upload truc tiep len uploadUrl bang cac parameters duoc tra ve.',
      '3. FE goi POST /upload/complete voi uploadId.',
      'product_image chi danh cho Admin/Owner; review_image chi danh cho User.',
      'Ho tro JPEG, PNG, WebP. Avatar toi da 5 MB; cac loai anh khac toi da 10 MB.',
    ].join('\n'),
  })
  @ApiCreatedResponse({
    description: 'Chu ky va tham so upload truc tiep len Cloudinary',
  })
  @ApiBadRequestResponse({
    description: 'Loai file hoac kich thuoc file khong hop le',
  })
  @ApiForbiddenResponse({
    description: 'Role hien tai khong duoc upload loai anh da chon',
  })
  createSignature(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUploadSignatureDto,
  ) {
    return this.uploadService.createSignature(user.sub, user.role, dto);
  }

  @Post('complete')
  @ApiOperation({
    summary: 'Buoc 3 - Xac nhan upload va nhan Upload ID',
    description:
      'BE doc metadata tu Cloudinary, xac minh ownership, dinh dang, kich thuoc va thoi han chu ky truoc khi kich hoat upload.',
  })
  @ApiOkResponse({
    description: 'Upload da duoc xac minh va co the gan vao avatar/product/review',
  })
  @ApiBadRequestResponse({
    description:
      'Upload het han, file khong ton tai, sai dinh dang, sai kich thuoc hoac khong khop chu ky',
  })
  @ApiNotFoundResponse({
    description: 'Upload khong ton tai hoac khong thuoc user hien tai',
  })
  completeUpload(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.uploadService.completeUpload(user.sub, dto.uploadId);
  }
}
