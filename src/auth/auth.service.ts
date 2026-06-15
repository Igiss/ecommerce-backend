import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../database/schemas/user.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.createAccount(registerDto, Role.User);

    return {
      user,
      accessToken: await this.signToken(String(user.id), user.email, user.role, user.status),
    };
  }

  async registerOwner(registerDto: RegisterDto) {
    return {
      user: await this.createAccount(registerDto, Role.Owner, 'pending'),
      message: 'Owner account registered and is waiting for admin approval',
    };
  }

  private async createAccount(
    registerDto: RegisterDto,
    role: Role,
    status: 'pending' | 'active' = 'active',
  ) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const password = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password,
      role,
      status,
    });

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'pending') {
      throw new UnauthorizedException('Owner account is waiting for admin approval');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is locked');
    }

    await this.usersService.recordLogin(user.id);

    return {
      user: this.usersService.toPublicUser(user),
      accessToken: await this.signToken(user.id, user.email, user.role, user.status),
    };
  }

  async getProfile(user: JwtPayload) {
    const currentUser = await this.usersService.findById(user.sub);
    return this.usersService.toPublicUser(currentUser);
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

  async googleLogin(user: UserDocument) {
    return {
      user: this.usersService.toPublicUser(user),
      accessToken: await this.signToken(user.id, user.email, user.role, user.status),
    };
  }

  private async signToken(
    userId: string,
    email: string,
    role: JwtPayload['role'],
    status: JwtPayload['status'],
  ) {
    const payload: JwtPayload = { sub: userId, email, role, status };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'change_this_secret',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });
  }
}
