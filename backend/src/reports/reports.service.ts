import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { Product } from '../inventory/product.entity';
import { Sale } from '../sales/sale.entity';

type Period = 'today' | '7' | '30' | 'all';

function startOfPeriod(period: Period): Date | null {
  if (period === 'all') return null;
  if (period === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(Date.now() - Number(period) * 86400000);
}

function parseRangeBound(dateStr: string, endOfDay: boolean): Date {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${dateStr}`);
  }
  d.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return d;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private activityService: ActivityService,
  ) {}

  async salesReport(period: Period, from?: string, to?: string) {
    let where: object = {};
    if (from || to) {
      if (!from || !to) {
        throw new BadRequestException(
          'Both "from" and "to" are required for a custom range',
        );
      }
      const start = parseRangeBound(from, false);
      const end = parseRangeBound(to, true);
      if (start > end) {
        throw new BadRequestException('"from" must be before "to"');
      }
      where = { createdAt: Between(start, end) };
    } else {
      const since = startOfPeriod(period);
      where = since ? { createdAt: MoreThanOrEqual(since) } : {};
    }

    const allSales = await this.saleRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    // Refunded sales must not count as revenue — the money went back out.
    const sales = allSales.filter((s) => !s.refunded);
    const refundCount = allSales.length - sales.length;

    const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const transactions = sales.length;
    const avgSale = transactions > 0 ? Math.round(revenue / transactions) : 0;

    const productTotals: Record<string, { qty: number; revenue: number }> = {};
    for (const sale of sales) {
      // Spread each sale's discount proportionally across its items so per-product
      // revenue actually reconciles with the sale's discounted total, not list price.
      const discountFactor = Number(sale.subtotal) > 0 ? Number(sale.total) / Number(sale.subtotal) : 1;
      for (const item of sale.items) {
        if (!productTotals[item.productName]) productTotals[item.productName] = { qty: 0, revenue: 0 };
        productTotals[item.productName].qty += item.qty;
        productTotals[item.productName].revenue += item.qty * Number(item.price) * discountFactor;
      }
    }
    const topProducts = Object.entries(productTotals)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period: from && to ? 'custom' : period,
      revenue,
      transactions,
      avgSale,
      refundCount,
      topProducts,
    };
  }

  async inventoryReport() {
    const [products, recentSales] = await Promise.all([
      this.productRepo.find({ order: { name: 'ASC' } }),
      this.saleRepo.find({ where: { createdAt: MoreThanOrEqual(new Date(Date.now() - 30 * 86400000)) } }),
    ]);

    const soldNames = new Set<string>();
    for (const sale of recentSales) {
      for (const item of sale.items) soldNames.add(item.productName);
    }

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      branch: p.branch,
      qty: p.qty,
      price: p.price,
      stockValue: p.qty * Number(p.price),
      moving: soldNames.has(p.name),
    }));
  }

  async eodSummary(actorId: string) {
    const summary = await this.salesReport('today');

    // No email/SMS provider is configured yet (per the proposal, that's a separate
    // cost/decision). We log the summary now so the data layer is real and ready —
    // wiring an actual send just means adding a provider call here later.
    await this.activityService.log(
      actorId,
      `Generated EOD sales summary (₦${summary.revenue.toLocaleString()} across ${summary.transactions} sales) — not yet emailed, no provider configured`,
    );

    return summary;
  }
}
