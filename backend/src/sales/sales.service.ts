import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { StaffRole } from '../common/roles.enum';
import { Product } from '../inventory/product.entity';
import { StaffService } from '../staff/staff.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { SaleItem } from './sale-item.entity';
import { Sale } from './sale.entity';

const EXPIRY_BLOCK_DAYS = 365;

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectDataSource() private dataSource: DataSource,
    private activityService: ActivityService,
    private staffService: StaffService,
  ) {}

  findAll(): Promise<Sale[]> {
    return this.saleRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByInvoice(invoiceNo: string): Promise<Sale> {
    const sale = await this.saleRepo.findOne({ where: { invoiceNo } });
    if (!sale)
      throw new NotFoundException('No sale found with that invoice number');
    return sale;
  }

  private async assertManagerApproval(
    actor: { role: StaffRole },
    managerPin: string | undefined,
    actionLabel: string,
  ): Promise<void> {
    if (actor.role === StaffRole.ADMIN) return;
    if (!managerPin || !(await this.staffService.verifyAnyAdminPin(managerPin))) {
      throw new BadRequestException(`Manager approval (Admin PIN) is required to ${actionLabel}`);
    }
  }

  async checkout(dto: CreateSaleDto, actor: { id: string; role: StaffRole }): Promise<Sale> {
    if (dto.discountPct) {
      await this.assertManagerApproval(actor, dto.managerPin, `apply a ${dto.discountPct}% discount`);
    }

    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleItems: SaleItem[] = [];
      let subtotal = 0;
      const overriddenNames: string[] = [];

      for (const line of dto.items) {
        const product = await productRepo
          .createQueryBuilder('product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: line.productId })
          .getOne();

        if (!product)
          throw new NotFoundException(`Product ${line.productId} not found`);
        if (product.qty < line.qty) {
          throw new BadRequestException(
            `Not enough stock for "${product.name}" (${product.qty} left)`,
          );
        }

        if (daysUntil(product.expiryDate) < EXPIRY_BLOCK_DAYS) {
          // Server-side is the only source of truth for this — a client sending
          // overrideExpiry:true is worthless unless the JWT actually says Admin.
          const canOverride = line.overrideExpiry && actor.role === StaffRole.ADMIN;
          if (!canOverride) {
            throw new BadRequestException(
              `"${product.name}" is within 1 year of expiry and is blocked from sale. Only an Admin can override this.`,
            );
          }
          overriddenNames.push(product.name);
        }

        product.qty -= line.qty;
        await productRepo.save(product);

        const saleItem = manager.getRepository(SaleItem).create({
          productId: product.id,
          productName: product.name,
          qty: line.qty,
          price: product.price,
        });
        saleItems.push(saleItem);
        subtotal += Number(product.price) * line.qty;
      }

      const discountPct = dto.discountPct || 0;
      const total = subtotal - Math.round(subtotal * (discountPct / 100));

      const invoiceNo = 'INV-' + Date.now().toString().slice(-8);
      const sale = manager.getRepository(Sale).create({
        invoiceNo,
        cashierId: actor.id,
        subtotal,
        discountPct,
        total,
        items: saleItems,
      });
      const saved = await manager.getRepository(Sale).save(sale);

      if (overriddenNames.length > 0) {
        await this.activityService.log(
          actor.id,
          `Overrode expiry block on ${overriddenNames.join(', ')} for sale ${invoiceNo}`,
        );
      }
      if (discountPct > 0) {
        await this.activityService.log(
          actor.id,
          `Applied ${discountPct}% discount to sale ${invoiceNo}${actor.role === StaffRole.ADMIN ? '' : ' (manager-approved)'}`,
        );
      }
      await this.activityService.log(
        actor.id,
        `Completed sale ${invoiceNo} (₦${total.toLocaleString()})`,
      );

      return saved;
    });
  }

  async refund(invoiceNo: string, dto: RefundSaleDto, actor: { id: string; role: StaffRole }): Promise<Sale> {
    await this.assertManagerApproval(actor, dto.managerPin, 'process this refund');

    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.getRepository(Sale).findOne({ where: { invoiceNo } });
      if (!sale) throw new NotFoundException('No sale found with that invoice number');
      if (sale.refunded) throw new BadRequestException('This sale has already been refunded');

      const productRepo = manager.getRepository(Product);
      for (const item of sale.items) {
        if (!item.productId) continue;
        const product = await productRepo.findOne({ where: { id: item.productId } });
        if (product) {
          product.qty += item.qty;
          await productRepo.save(product);
        }
      }

      sale.refunded = true;
      sale.refundedAt = new Date();
      const saved = await manager.getRepository(Sale).save(sale);

      await this.activityService.log(
        actor.id,
        `Processed refund for invoice ${invoiceNo} (₦${Number(sale.total).toLocaleString()})${actor.role === StaffRole.ADMIN ? '' : ' (manager-approved)'}`,
      );

      return saved;
    });
  }
}
