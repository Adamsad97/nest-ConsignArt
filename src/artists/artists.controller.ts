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
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@ApiTags('Artists')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Register an artist in the gallery catalog' })
  create(@Body() dto: CreateArtistDto, @CurrentUser() user: AuthenticatedUser) {
    return this.artistsService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GALLERY)
  @ApiOperation({ summary: 'List artists (gallery sees own, admin sees all)' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.artistsService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GALLERY, Role.ARTIST)
  @ApiOperation({ summary: 'Get an artist by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.artistsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.GALLERY, Role.ADMIN)
  @ApiOperation({ summary: 'Update an artist' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArtistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artistsService.update(id, dto, user);
  }

  @Patch(':id/transfer')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Transfer an artist to another gallery (admin only)',
  })
  transfer(
    @Param('id') id: string,
    @Body('galleryId') galleryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artistsService.transferGallery(id, galleryId, user);
  }

  @Delete(':id')
  @Roles(Role.GALLERY, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate an artist (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.artistsService.remove(id, user);
  }
}
