import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CouponsService } from './coupons.service';

describe('CouponsService owner scope', () => {
  it('scopes list, update and delete by ownerId from the JWT owner', async () => {
    const ownerId = new Types.ObjectId().toString();
    const filters: Record<string, unknown>[] = [];
    const listQuery = {
      sort: () => listQuery,
      exec: async () => [],
    };
    const couponModel = {
      find: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return listQuery;
      },
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return { exec: async () => null };
      },
      findOneAndDelete: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return { exec: async () => null };
      },
    };
    const service = new CouponsService(couponModel as never);
    const couponId = new Types.ObjectId().toString();

    await service.findAllByOwner(ownerId);
    await assert.rejects(
      service.updateByOwner(couponId, ownerId, {}),
      NotFoundException,
    );
    await assert.rejects(
      service.removeByOwner(couponId, ownerId),
      NotFoundException,
    );

    assert.equal(
      filters.every((filter) => String(filter.ownerId) === ownerId),
      true,
    );
  });
});
