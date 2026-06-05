import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const password = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password,
    });

    return {
      user,
      accessToken: await this.signToken(String(user.id), user.email, user.role),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is locked');
    }

    return {
      user: this.usersService.toPublicUser(user),
      accessToken: await this.signToken(user.id, user.email, user.role),
    };
  }

  async getProfile(user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  async changePassword(user: JwtPayload, changePasswordDto: ChangePasswordDto) {
    const currentUser = await this.usersService.findByIdWithPassword(user.sub);
    if (!currentUser || !(await bcrypt.compare(changePasswordDto.oldPassword, currentUser.password))) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersService.updatePassword(user.sub, password);

    return { message: 'Password changed successfully' };
  }

  private async signToken(userId: string, email: string, role: JwtPayload['role']) {
    const payload: JwtPayload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'change_this_secret',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });
  }
}
