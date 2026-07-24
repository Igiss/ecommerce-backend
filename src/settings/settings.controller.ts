import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('sepay')
  @ApiOperation({ summary: '[Public/Admin] Get SePay Bank settings' })
  getSepaySettings() {
    return this.settingsService.getSepaySettings();
  }

  @Put('sepay')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: '[Admin] Update SePay Bank settings' })
  updateSepaySettings(
    @Body()
    dto: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      apiKey?: string;
    },
  ) {
    return this.settingsService.updateSepaySettings(dto);
  }
}
