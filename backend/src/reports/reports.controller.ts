import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRole } from '../common/roles.enum';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN, StaffRole.PHARMACIST)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  salesReport(@Query('period') period: 'today' | '7' | '30' | 'all' = 'today') {
    return this.reportsService.salesReport(period);
  }

  @Get('inventory')
  inventoryReport() {
    return this.reportsService.inventoryReport();
  }

  @Post('eod-summary')
  eodSummary(@CurrentUser() user: { id: string }) {
    return this.reportsService.eodSummary(user.id);
  }
}
