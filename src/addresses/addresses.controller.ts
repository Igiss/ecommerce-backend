import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: '[User] Lấy danh sách địa chỉ của tài khoản' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.addressesService.findAll(user.sub);
  }

  @Post()
  @ApiOperation({ summary: '[User] Thêm địa chỉ mới' })
  @ApiCreatedResponse({ description: 'Địa chỉ đã được tạo' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[User] Cập nhật địa chỉ' })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'ID số của địa chỉ' })
  @ApiBadRequestResponse({ description: 'ID địa chỉ phải là số nguyên dương' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.sub, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: '[User] Đặt địa chỉ làm mặc định' })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'ID số của địa chỉ' })
  setDefault(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParsePositiveIntPipe) id: number,
  ) {
    return this.addressesService.setDefault(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[User] Xóa địa chỉ' })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'ID số của địa chỉ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParsePositiveIntPipe) id: number,
  ) {
    return this.addressesService.remove(user.sub, id);
  }
}
