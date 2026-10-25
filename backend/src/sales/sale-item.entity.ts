import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../inventory/product.entity';
import { Sale } from './sale.entity';

@Entity('sale_item')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column()
  saleId: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ nullable: true })
  productId: string | null;

  @Column()
  productName: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;
}
