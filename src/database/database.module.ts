import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { Order, OrderSchema } from './schemas/order.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { DbService } from './db.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [DbService],
  exports: [DbService],
})
export class DatabaseModule {}
