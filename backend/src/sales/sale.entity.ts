import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Staff } from '../staff/staff.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sale')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNo: string;

  @ManyToOne(() => Staff, { eager: true })
  @JoinColumn({ name: 'cashierId' })
  cashier: Staff;

  @Column()
  cashierId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: number;

  @OneToMany(() => SaleItem, (item) => item.sale, {
    cascade: true,
    eager: true,
  })
  items: SaleItem[];

  @Column({ type: 'int', default: 0 })
  discountPct: number;

  @Column({ default: false })
  refunded: boolean;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
