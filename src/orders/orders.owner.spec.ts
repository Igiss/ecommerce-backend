import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrdersService } from './orders.service';

describe('OrdersService owner scope', () => {
  it('scopes reads and fulfillment updates by item ownerId from JWT', async () => {
    const ownerId = new Types.ObjectId().toString();
    const filters: Record<string, unknown>[] = [];
    const orderModel = {
      aggregate: (pipeline: Array<Record<string, unknown>>) => {
        const match = pipeline[0].$match as Record<string, unknown>;
        filters.push(match);
        return { exec: async () => [] };
      },
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return { exec: async () => null };
      },
    };
    const service = new OrdersService(
      orderModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const orderId = new Types.ObjectId().toString();

    await assert.rejects(
      service.findOneByOwner(orderId, ownerId),
      NotFoundException,
    );
    await assert.rejects(
      service.updateOwnerFulfillment(orderId, ownerId, {
        orderStatus: OrderStatus.Confirmed,
      }),
      NotFoundException,
    );

    assert.equal(
      filters.every(
        (filter) => String(filter['items.ownerId']) === ownerId,
      ),
      true,
    );
  });
});
