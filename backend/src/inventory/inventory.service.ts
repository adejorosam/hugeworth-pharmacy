import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { Branch } from '../common/branch.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private activityService: ActivityService,
  ) {}

  findAll(branch?: Branch): Promise<Product[]> {
    return this.productRepo.find({
      where: branch ? { branch } : {},
      order: { name: 'ASC' },
    });
  }

  async branchOverview() {
    const products = await this.productRepo.find();
    const byName: Record<string, Partial<Record<Branch, number>>> = {};

    for (const p of products) {
      if (!byName[p.name]) byName[p.name] = {};
      byName[p.name][p.branch] = (byName[p.name][p.branch] || 0) + p.qty;
    }

    return Object.entries(byName).map(([name, branches]) => ({
      name,
      branches,
      total: Object.values(branches).reduce((sum, qty) => sum + (qty || 0), 0),
    }));
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto, actorId: string): Promise<Product> {
    const product = this.productRepo.create(dto);
    const saved = await this.productRepo.save(product);
    await this.activityService.log(actorId, `Added product "${saved.name}"`);
    return saved;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    actorId: string,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);
    await this.activityService.log(actorId, `Updated product "${saved.name}"`);
    return saved;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
    await this.activityService.log(
      actorId,
      `Removed product "${product.name}"`,
    );
  }

  async restock(id: string, amount: number, actorId: string): Promise<Product> {
    const product = await this.findOne(id);
    product.qty += amount;
    const saved = await this.productRepo.save(product);
    await this.activityService.log(
      actorId,
      `Restocked ${amount} units of "${saved.name}"`,
    );
    return saved;
  }
}
