import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

@Schema({ versionKey: false })
export class Counter {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, default: 0 })
  sequence: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
