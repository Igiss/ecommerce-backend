import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryLogsService } from './inventory-logs.service';
import { InventoryLog, InventoryLogSchema } from '../database/schemas/inventory-log.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: InventoryLog.name, schema: InventoryLogSchema }])],
  providers: [InventoryLogsService],
  exports: [InventoryLogsService],
})
export class InventoryLogsModule {}
