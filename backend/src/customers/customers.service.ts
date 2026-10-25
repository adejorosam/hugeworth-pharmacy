import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private activityService: ActivityService,
  ) {}

  findAll(): Promise<Customer[]> {
    return this.customerRepo.find({ order: { refillDue: 'ASC' } });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto, actorId: string): Promise<Customer> {
    const customer = this.customerRepo.create(dto);
    const saved = await this.customerRepo.save(customer);
    await this.activityService.log(actorId, `Added customer "${saved.name}"`);
    return saved;
  }

  async update(id: string, dto: UpdateCustomerDto, actorId: string): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    const saved = await this.customerRepo.save(customer);
    await this.activityService.log(actorId, `Updated customer "${saved.name}"`);
    return saved;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepo.remove(customer);
    await this.activityService.log(actorId, `Removed customer "${customer.name}"`);
  }

  async sendReminder(id: string, actorId: string): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.lastReminded = new Date();
    const saved = await this.customerRepo.save(customer);

    // Same as EOD summary — no SMS/WhatsApp provider configured yet, so this is
    // logged rather than actually sent. Wiring a real send is just a provider call here.
    await this.activityService.log(
      actorId,
      `Sent refill reminder to ${saved.name} for ${saved.medication} — not yet sent via SMS, no provider configured`,
    );
    return saved;
  }
}
