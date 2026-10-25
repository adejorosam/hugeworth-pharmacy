import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { Product } from '../inventory/product.entity';
import { Sale } from '../sales/sale.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Product]), ActivityModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
