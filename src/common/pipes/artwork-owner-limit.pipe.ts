import { PipeTransform, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { ArtworkStatus } from '../../artworks/enums/artwork-status.enum';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

export const MAX_ACTIVE_ARTWORKS = 50;

@Injectable()
export class ArtworkOwnerLimitPipe implements PipeTransform {
  constructor(
    @InjectRepository(Artwork)
    private readonly artworksRepository: Repository<Artwork>,
  ) {}

  async transform(value: {
    artistId: string;
    [key: string]: unknown;
  }): Promise<typeof value> {
    const artistId = value?.artistId;

    if (!artistId) {
      return value;
    }

    const count = await this.artworksRepository.count({
      where: {
        artist: { id: artistId },
        status: In([ArtworkStatus.AVAILABLE, ArtworkStatus.ON_LOAN]),
      },
    });

    if (count >= MAX_ACTIVE_ARTWORKS) {
      throw new BusinessRuleViolationException(
        `An artist cannot have more than ${MAX_ACTIVE_ARTWORKS} active artworks in a gallery`,
        'ARTWORK_LIMIT_EXCEEDED',
      );
    }

    return value;
  }
}
