import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from './schemas/tenant.schema';
import { Product } from './schemas/product.schema';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async findTenantByBusinessNumber(
    whatsappNumber: string,
  ): Promise<Tenant | null> {
    return this.tenantModel.findOne({ whatsapp_number: whatsappNumber }).exec();
  }

  async findTenantByAdminPhone(adminPhone: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({ admin_phone: adminPhone }).exec();
  }

  async saveTenantOnboarding(data: {
    business_name: string;
    admin_phone: string;
    whatsapp_number: string;
  }) {
    this.logger.log(`Creating Tenant in smedb: ${data.business_name}`);
    const newTenant = new this.tenantModel({
      ...data,
      status: 'trial',
      chat_count: 0,
    });
    return newTenant.save();
  }

  addProduct(tenantId: any, name: string, price: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return new this.productModel({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tenantId,
      name,
      price,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    }).save();
  }
}

/* Old version 1
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from './schemas/tenant.schema';
import { Product } from './schemas/product.schema';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async findTenantByBusinessNumber(whatsappNumber: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({ whatsapp_number: whatsappNumber }).exec();
  }

  async findTenantByAdminPhone(adminPhone: string): Promise<Tenant | null> {
    return this.tenantModel.findOne({ admin_phone: adminPhone }).exec();
  }

  async saveTenantOnboarding(data: { business_name: string, admin_phone: string, whatsapp_number: string }) {
    this.logger.log(`Creating Tenant in smedb: ${data.business_name}`);
    const newTenant = new this.tenantModel({
      ...data,
      status: 'trial',
      chat_count: 0
    });
    return newTenant.save();
  }

  async addProduct(tenantId: any, name: string, price: number) {
    return new this.productModel({
      tenantId,
      name,
      price
    }).save();
  }
}
*/
