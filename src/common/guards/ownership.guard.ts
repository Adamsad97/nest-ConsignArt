import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ArtworksService } from '../../artworks/artworks.service';
import { Role } from '../../users/enums/role.enum';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly artworksService: ArtworksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, params } = context.switchToHttp().getRequest<Request>();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const artwork = await this.artworksService.findOne(params.id as string);
    if (artwork.gallery.id !== user.id) {
      throw new ForbiddenException('You do not own this artwork');
    }

    return true;
  }
}
