import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../database/schemas/notification.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateNotificationDto) {
    return this.notificationModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
  }

  async broadcast(dto: Omit<CreateNotificationDto, 'userId'>) {
    const users = await this.userModel.find({ status: 'active' }).select('_id').exec();
    const notifications = users.map(u => ({
      ...dto,
      userId: u._id,
    }));
    const chunkSize = 1000;
    for (let i = 0; i < notifications.length; i += chunkSize) {
      await this.notificationModel.insertMany(notifications.slice(i, i + chunkSize));
    }
    return { success: true, count: notifications.length };
  }

  async findMine(userId: string) {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: id, userId },
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel
      .updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() },
      )
      .exec();
    return { message: 'All notifications marked as read' };
  }
}
