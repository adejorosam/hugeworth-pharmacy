import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Staff } from '../staff/staff.entity';

@Entity('activity_log')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Staff, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;

  @Column({ nullable: true })
  staffId: string | null;

  @Column()
  action: string;

  @CreateDateColumn()
  createdAt: Date;
}
