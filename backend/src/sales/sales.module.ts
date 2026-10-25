import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { StaffModule } from '../staff/staff.module';
import { SaleItem } from './sale-item.entity';
import { Sale } from './sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem]), ActivityModule, StaffModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
