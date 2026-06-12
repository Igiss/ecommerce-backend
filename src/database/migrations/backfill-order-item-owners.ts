import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Product, ProductDocument } from '../schemas/product.schema';

async function migrate(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
    throw new Error('Use --allow-production to run this migration in production');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));
    const productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
    const orders = await orderModel
      .find({ 'items.ownerId': { $exists: false } })
      .select('items')
      .exec();

    for (const order of orders) {
      const productIds = order.items
        .map((item) => item.productId)
        .filter((id): id is NonNullable<typeof id> => Boolean(id));
      const products = await productModel
        .find({ _id: { $in: productIds } })
        .select('_id createdBy')
        .lean()
        .exec();
      const owners = new Map(products.map((product) => [String(product._id), product.createdBy]));
      const items = order.items.map((item) => ({
        ...item,
        ownerId: item.ownerId || (item.productId ? owners.get(String(item.productId)) : undefined),
        fulfillmentStatus: item.fulfillmentStatus || OrderStatus.Pending,
      }));
      await orderModel.updateOne({ _id: order._id }, { $set: { items } }).exec();
    }

    console.log(`Backfilled ${orders.length} orders`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void migrate().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
