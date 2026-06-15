import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../database/schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto) {
    return this.notificationModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
    });
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
