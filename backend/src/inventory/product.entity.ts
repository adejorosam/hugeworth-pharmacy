import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../common/branch.enum';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column()
  supplier: string;

  @Column({ type: 'enum', enum: Branch, default: Branch.ODA_ROAD })
  branch: Branch;

  @Column({ type: 'int', default: 0 })
  qty: number;

  @Column({ type: 'int', default: 0 })
  minQty: number;

  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  @Column({ type: 'date' })
  expiryDate: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
