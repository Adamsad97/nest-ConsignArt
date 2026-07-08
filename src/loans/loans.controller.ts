import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new artwork loan' })
  create(@Body() dto: CreateLoanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.create(dto, user);
  }

  @Get()
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'List loans' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.loansService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Get a loan by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.findOne(id, user);
  }

  @Patch(':id/return')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Mark a loan as returned' })
  returnLoan(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.returnLoan(id, user);
  }
}
