import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomDesign, CustomDesignSchema } from '../database/schemas/custom-design.schema';
import { Product, ProductSchema } from '../database/schemas/product.schema';
import { CustomDesignsController } from './custom-designs.controller';
import { CustomDesignsService } from './custom-designs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomDesign.name, schema: CustomDesignSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [CustomDesignsController],
  providers: [CustomDesignsService],
})
export class CustomDesignsModule {}
