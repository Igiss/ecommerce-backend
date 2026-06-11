import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PipelineStage, Types } from 'mongoose';
import { ReportsService } from './reports.service';

function createService(productIds: Types.ObjectId[]) {
  const productFilters: Record<string, unknown>[] = [];
  const pipelines: PipelineStage[][] = [];

  const productModel = {
    find: (filter: Record<string, unknown>) => {
      productFilters.push(filter);
      return {
        select: () => ({
          lean: () => ({
            exec: async () => productIds.map((_id) => ({ _id })),
          }),
        }),
      };
    },
  };

  const orderModel = {
    aggregate: (pipeline: PipelineStage[]) => {
      pipelines.push(pipeline);
      return { exec: async () => [] };
    },
  };

  const service = new ReportsService(
    {} as never,
    productModel as never,
    orderModel as never,
  );

  return { service, productFilters, pipelines };
}

describe('ReportsService owner scope', () => {
  it('keeps deleted product IDs in historical owner reports', async () => {
    const productId = new Types.ObjectId();
    const ownerId = new Types.ObjectId().toString();
    const { service, productFilters, pipelines } = createService([productId]);

    await service.getTopProducts(ownerId);

    assert.deepEqual(productFilters[0], {
      createdBy: new Types.ObjectId(ownerId),
    });
    assert.deepEqual(pipelines[0][2], {
      $match: { 'items.productId': { $in: [productId] } },
    });
  });

  it('applies an inclusive UTC date-only range to owner data', async () => {
    const productId = new Types.ObjectId();
    const { service, pipelines } = createService([productId]);

    await service.getTopProducts(new Types.ObjectId().toString(), {
      from: '2026-01-01',
      to: '2026-01-31',
    });

    assert.deepEqual(pipelines[0][0], {
      $match: {
        orderStatus: 'completed',
        createdAt: {
          $gte: new Date('2026-01-01T00:00:00.000Z'),
          $lte: new Date('2026-01-31T23:59:59.999Z'),
        },
      },
    });
  });

  it('rejects a reversed date range', async () => {
    const { service } = createService([]);

    await assert.rejects(
      service.getTopProducts(undefined, {
        from: '2026-02-01',
        to: '2026-01-01',
      }),
      BadRequestException,
    );
  });
});
