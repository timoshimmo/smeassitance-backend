import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant } from './schemas/tenant.schema';
import { Order } from './schemas/order.schema';

@Injectable()
export class DbService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async findTenantByWhatsApp(whatsappNumber: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({ whatsapp_number: whatsappNumber }).exec();
  }

  async createTenant(data: Partial<Tenant>) {
    return new this.tenantModel(data).save();
  }

  async logOrder(tenantId: string, orderData: any) {
    return new this.orderModel({
      tenantId: new Types.ObjectId(tenantId),
      ...orderData,
    }).save();
  }
}
