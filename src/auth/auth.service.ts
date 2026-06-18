import 'dotenv/config';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterShippingUnitDto } from './dto/register-shipping-unit.dto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../database/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { ShippingUnit, ShippingUnitDocument } from '../database/schemas/shipping-unit.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(ShippingUnit.name) private readonly shippingUnitModel: Model<ShippingUnitDocument>,
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

  async registerShippingUnit(dto: RegisterShippingUnitDto) {
    const user = await this.createAccount(
      { fullName: dto.fullName, email: dto.email, password: dto.password, phone: dto.phone },
      Role.ShippingUnit,
      'pending',
    );

    await this.shippingUnitModel.create({
      userId: user.id,
      companyName: dto.companyName,
      coverageWards: dto.coverageWards ?? [],
      contactPhone: dto.contactPhone,
      address: dto.address,
    });

    return {
      user,
      message: 'ShippingUnit account registered and is waiting for admin approval',
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
      throw new UnauthorizedException('Account is waiting for admin approval');
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
