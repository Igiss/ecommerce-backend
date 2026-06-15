import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductsService } from './products.service';

describe('ProductsService owner scope', () => {
  it('scopes listing and mutations by createdBy from the JWT owner', async () => {
    const ownerId = new Types.ObjectId().toString();
    const filters: Record<string, unknown>[] = [];
    const query = {
      populate: () => query,
      sort: () => query,
      skip: () => query,
      limit: () => query,
      exec: async () => [],
    };
    const productModel = {
      find: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return query;
      },
      countDocuments: (filter: Record<string, unknown>) => ({
        exec: async () => {
          filters.push(filter);
          return 0;
        },
      }),
      findOne: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return { exec: async () => null };
      },
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        filters.push(filter);
        return { exec: async () => null };
      },
    };
    const service = new ProductsService(
      productModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.findAllByOwner(ownerId, {});
    await assert.rejects(service.updateByOwner(1, ownerId, {}), NotFoundException);
    await assert.rejects(service.removeByOwner(1, ownerId), NotFoundException);

    assert.equal(
      filters.every(
        (filter) =>
          'createdBy' in filter && String(filter.createdBy) === ownerId,
      ),
      true,
    );
  });
});
