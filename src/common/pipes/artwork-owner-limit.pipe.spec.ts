import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ArtworkOwnerLimitPipe,
  MAX_ACTIVE_ARTWORKS,
} from './artwork-owner-limit.pipe';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

const mockArtworksRepository = { count: vi.fn() };

describe('ArtworkOwnerLimitPipe', () => {
  let pipe: ArtworkOwnerLimitPipe;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtworkOwnerLimitPipe,
        {
          provide: getRepositoryToken(Artwork),
          useValue: mockArtworksRepository,
        },
      ],
    }).compile();

    pipe = module.get<ArtworkOwnerLimitPipe>(ArtworkOwnerLimitPipe);
  });

  it('passes when artist has 0 active artworks', async () => {
    mockArtworksRepository.count.mockResolvedValue(0);
    const input = { artistId: 'artist-1', title: 'Test' };
    await expect(pipe.transform(input)).resolves.toEqual(input);
  });

  it('passes when artist has 49 active artworks', async () => {
    mockArtworksRepository.count.mockResolvedValue(MAX_ACTIVE_ARTWORKS - 1);
    const input = { artistId: 'artist-1', title: 'Test' };
    await expect(pipe.transform(input)).resolves.toEqual(input);
  });

  it('throws BusinessRuleViolationException when artist has 50 active artworks', async () => {
    mockArtworksRepository.count.mockResolvedValue(MAX_ACTIVE_ARTWORKS);
    const input = { artistId: 'artist-1', title: 'Test' };
    await expect(pipe.transform(input)).rejects.toThrow(
      BusinessRuleViolationException,
    );

    try {
      await pipe.transform(input);
    } catch (error) {
      if (error instanceof BusinessRuleViolationException) {
        expect(error.rule).toBe('ARTWORK_LIMIT_EXCEEDED');
      }
    }
  });

  it('skips check when artistId is not provided', async () => {
    const input = { title: 'Test' };
    await expect(pipe.transform(input as any)).resolves.toEqual(input);
    expect(mockArtworksRepository.count).not.toHaveBeenCalled();
  });
});
