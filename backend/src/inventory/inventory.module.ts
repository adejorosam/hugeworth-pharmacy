import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Product } from './product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ActivityModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
