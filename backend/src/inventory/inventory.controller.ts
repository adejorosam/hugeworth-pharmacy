import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Branch } from '../common/branch.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRole } from '../common/roles.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { RestockDto } from './dto/restock.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN, StaffRole.PHARMACIST)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  findAll(@Query('branch') branch?: Branch) {
    return this.inventoryService.findAll(branch);
  }

  @Get('branches/overview')
  branchOverview() {
    return this.inventoryService.branchOverview();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: { id: string }) {
    return this.inventoryService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.update(id, dto, user.id);
  }

  @Patch(':id/restock')
  restock(
    @Param('id') id: string,
    @Body() dto: RestockDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.restock(id, dto.amount, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.inventoryService.remove(id, user.id);
  }
}
