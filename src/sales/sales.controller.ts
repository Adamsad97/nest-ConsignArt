import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Process a sale (atomic transaction)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.processSale(dto, user);
  }

  @Get()
  @Roles(Role.GALLERY, Role.ADMIN, Role.ARTIST)
  @ApiOperation({ summary: 'List sales (scoped by role)' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.GALLERY, Role.ADMIN, Role.ARTIST)
  @ApiOperation({ summary: 'Get a sale by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findOne(id, user);
  }

  @Get(':id/invoice')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Get the invoice for a sale' })
  findInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findInvoice(id, user);
  }
}
