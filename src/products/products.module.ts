import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { Product, ProductSchema } from '../database/schemas/product.schema';
import { Counter, CounterSchema } from '../database/schemas/counter.schema';
import { ProductsController } from './products.controller';
import { OwnerProductsController } from './owner-products.controller';
import { ProductsService } from './products.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    CategoriesModule,
    UploadModule,
  ],
  controllers: [ProductsController, OwnerProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
