import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArtworksService } from './artworks.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { ArtworkOwnerLimitPipe } from '../common/pipes/artwork-owner-limit.pipe';
import { PriceNormalizationPipe } from '../common/pipes/price-normalization.pipe';

@ApiTags('Artworks')
@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all artworks (public)' })
  findAll() {
    return this.artworksService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get an artwork by ID (public)' })
  findOne(@Param('id') id: string) {
    return this.artworksService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new artwork in the gallery' })
  create(
    @Body(ArtworkOwnerLimitPipe) dto: CreateArtworkDto,
    @Body('price', PriceNormalizationPipe) price: number,
    @Body('reservePrice', PriceNormalizationPipe) reservePrice: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artworksService.create({ ...dto, price, reservePrice }, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard, OwnershipGuard)
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Change artwork status with history tracking' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artworksService.changeStatus(id, dto.status, user, dto.reason);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard, OwnershipGuard)
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Update artwork details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArtworkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artworksService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard, OwnershipGuard)
  @Roles(Role.GALLERY, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an artwork' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.artworksService.remove(id, user);
  }
}
