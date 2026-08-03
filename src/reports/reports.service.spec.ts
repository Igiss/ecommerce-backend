import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PipelineStage, Types } from 'mongoose';
import { ReportsService } from './reports.service';

function createService(productIds: Types.ObjectId[]) {
  const productFilters: Record<string, unknown>[] = [];
  const pipelines: PipelineStage[][] = [];
  const userPipelines: PipelineStage[][] = [];

  const userModel = {
    aggregate: (pipeline: PipelineStage[]) => {
      userPipelines.push(pipeline);
      return { exec: async () => [{ metadata: [{ total: 1 }], data: [] }] };
    },
  };

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
    userModel as never,
    productModel as never,
    orderModel as never,
    {} as never,
    {} as never,
  );

  return { service, productFilters, pipelines, userPipelines };
}

describe('ReportsService owner scope', () => {
  it('executes admin shop comparison aggregation on userModel', async () => {
    const { service, userPipelines } = createService([]);
    const res = await service.getAdminShopsComparison({
      period: '30days',
      sortBy: 'totalItemsSold',
      order: 'desc',
      page: 1,
      limit: 10,
    });

    assert.equal(res.meta.total, 1);
    assert.equal(userPipelines.length, 1);
    assert.deepEqual(userPipelines[0][0], { $match: { role: 'owner' } });
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
