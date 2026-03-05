import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Tenant extends Document {
  @Prop({ required: true })
  business_name: string;

  @Prop({ required: true, unique: true })
  admin_phone: string;

  @Prop({ default: 'twilio' })
  provider: string;

  @Prop({ default: null })
  whatsapp_number: string;

  @Prop({ default: null })
  waba_id: string;

  @Prop({ default: null })
  phone_number_id: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
