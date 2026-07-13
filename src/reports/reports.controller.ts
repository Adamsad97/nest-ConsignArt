import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class GenerateStatementDto {
  @ApiProperty()
  @IsUUID()
  artistId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  periodEnd: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('artist-statements')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Generate an artist statement for a period' })
  generateStatement(
    @Body() dto: GenerateStatementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.generateArtistStatement(
      dto.artistId,
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      user,
    );
  }

  @Get('artist-statements/artist/:artistId')
  @Roles(Role.GALLERY, Role.ADMIN, Role.ARTIST)
  @ApiOperation({ summary: 'List statements for an artist' })
  findStatements(@Param('artistId') artistId: string) {
    return this.reportsService.findStatementsByArtist(artistId);
  }

  @Get('dashboard/gallery')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({
    summary: 'Gallery dashboard: revenue, top artists, sales count',
  })
  galleryDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getGalleryDashboard(user);
  }

  @Get('dashboard/artist/:artistId')
  @Roles(Role.ARTIST, Role.GALLERY, Role.ADMIN)
  @ApiOperation({
    summary: 'Artist dashboard: earnings, commissions, available artworks',
  })
  artistDashboard(
    @Param('artistId') artistId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getArtistDashboard(artistId, user);
  }

  @Get('dashboard/admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard: platform-wide statistics' })
  adminDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getAdminDashboard(user);
  }
}
