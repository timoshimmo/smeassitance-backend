import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  customer_phone: string;

  @Prop({ type: [Object] })
  items: Array<{ name: string; price: number; quantity: number }>;

  @Prop({ required: true })
  total_amount: number;

  @Prop({ default: 'pending' })
  status: 'pending' | 'completed' | 'cancelled';
}

export const OrderSchema = SchemaFactory.createForClass(Order);
