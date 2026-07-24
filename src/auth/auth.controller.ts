import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterShippingUnitDto } from './dto/register-shipping-unit.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { UserDocument } from '../database/schemas/user.schema';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '[Public] Đăng ký tài khoản user mới' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    setAuthCookie(response, result.accessToken, this.isProduction());
    return { user: result.user };
  }

  @Post('register-owner')
  @ApiOperation({ summary: '[Public] Đăng ký tài khoản owner chờ admin duyệt' })
  registerOwner(@Body() registerDto: RegisterOwnerDto) {
    return this.authService.registerOwner(registerDto);
  }

  @Post('register-shipping-unit')
  @ApiOperation({ summary: '[Public] Đăng ký tài khoản đơn vị vận chuyển — chờ admin duyệt' })
  registerShippingUnit(@Body() dto: RegisterShippingUnitDto) {
    return this.authService.registerShippingUnit(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '[Public] Đăng nhập và nhận access token' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    setAuthCookie(response, result.accessToken, this.isProduction());
    return { user: result.user };
  }

  @Get('google')
  @ApiOperation({ summary: '[Public] Chuyển hướng sang trang đăng nhập Google' })
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @ApiOperation({ summary: '[Public] Google OAuth callback và chuyển hướng về frontend' })
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const result = await this.authService.googleLogin(request.user as UserDocument);
    setAuthCookie(response, result.accessToken, this.isProduction());
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3005'
    ).replace(/\/$/, '');
    return response.redirect(
      `${frontendUrl}/auth/google/callback?success=true&token=${result.accessToken}`,
    );
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: '[User] Lấy profile tài khoản đang đăng nhập' })
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: '[User] Đổi mật khẩu tài khoản đang đăng nhập' })
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @Post('logout')
  @ApiOperation({ summary: '[Public] Xoa cookie dang nhap' })
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookie(response, this.isProduction());
    return { message: 'Logged out successfully' };
  }

  private isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
