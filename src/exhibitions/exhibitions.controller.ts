import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExhibitionsService } from './exhibitions.service';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { UpdateExhibitionDto } from './dto/update-exhibition.dto';
import { AddArtworkDto } from './dto/add-artwork.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { ExhibitionStatus } from './entities/enums/exhibition-status.enum';

@ApiTags('Exhibitions')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('exhibitions')
export class ExhibitionsController {
  constructor(private readonly exhibitionsService: ExhibitionsService) {}

  @Post()
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Create an exhibition' })
  create(
    @Body() dto: CreateExhibitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exhibitionsService.create(dto, user);
  }

  @Get()
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'List exhibitions' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.exhibitionsService.findAll(user, pagination);
  }

  @Get(':id')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Get an exhibition by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exhibitionsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Update an exhibition' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExhibitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exhibitionsService.update(id, dto, user);
  }

  @Patch(':id/start')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Start the exhibition (sets artworks to ON_LOAN)' })
  start(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exhibitionsService.updateStatus(
      id,
      ExhibitionStatus.ONGOING,
      user,
    );
  }

  @Patch(':id/close')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({
    summary: 'Close the exhibition (returns artworks to AVAILABLE)',
  })
  close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exhibitionsService.updateStatus(
      id,
      ExhibitionStatus.CLOSED,
      user,
    );
  }

  @Post(':id/artworks')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Add an artwork to the exhibition' })
  addArtwork(
    @Param('id') id: string,
    @Body() dto: AddArtworkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exhibitionsService.addArtwork(id, dto, user);
  }

  @Delete(':id/artworks/:artworkId')
  @Roles(Role.GALLERY, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an artwork from the exhibition' })
  removeArtwork(
    @Param('id') id: string,
    @Param('artworkId') artworkId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exhibitionsService.removeArtwork(id, artworkId, user);
  }

  @Delete(':id')
  @Roles(Role.GALLERY, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exhibition' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exhibitionsService.remove(id, user);
  }
}
