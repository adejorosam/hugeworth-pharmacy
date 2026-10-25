import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRole } from '../common/roles.enum';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Roles(StaffRole.ADMIN, StaffRole.PHARMACIST, StaffRole.CASHIER)
  @Post()
  checkout(@Body() dto: CreateSaleDto, @CurrentUser() user: { id: string; role: StaffRole }) {
    return this.salesService.checkout(dto, user);
  }

  @Roles(StaffRole.ADMIN, StaffRole.PHARMACIST, StaffRole.CASHIER)
  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Roles(StaffRole.ADMIN, StaffRole.PHARMACIST, StaffRole.CASHIER)
  @Get(':invoiceNo')
  findByInvoice(@Param('invoiceNo') invoiceNo: string) {
    return this.salesService.findByInvoice(invoiceNo);
  }

  @Roles(StaffRole.ADMIN, StaffRole.PHARMACIST, StaffRole.CASHIER)
  @Post(':invoiceNo/refund')
  refund(
    @Param('invoiceNo') invoiceNo: string,
    @Body() dto: RefundSaleDto,
    @CurrentUser() user: { id: string; role: StaffRole },
  ) {
    return this.salesService.refund(invoiceNo, dto, user);
  }
}
