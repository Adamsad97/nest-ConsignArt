import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ArtworkOwnerLimitPipe,
  MAX_ACTIVE_ARTWORKS,
} from './artwork-owner-limit.pipe';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

const mockRepo = { count: jest.fn() };

describe('ArtworkOwnerLimitPipe', () => {
  let pipe: ArtworkOwnerLimitPipe;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtworkOwnerLimitPipe,
        { provide: getRepositoryToken(Artwork), useValue: mockRepo },
      ],
    }).compile();

    pipe = module.get<ArtworkOwnerLimitPipe>(ArtworkOwnerLimitPipe);
  });

  it('passes when artist has 0 active artworks', async () => {
    mockRepo.count.mockResolvedValue(0);
    const input = { artistId: 'a-1', title: 'Test' };
    await expect(pipe.transform(input)).resolves.toEqual(input);
  });

  it('passes when artist has 49 active artworks', async () => {
    mockRepo.count.mockResolvedValue(MAX_ACTIVE_ARTWORKS - 1);
    const input = { artistId: 'a-1', title: 'Test' };
    await expect(pipe.transform(input)).resolves.toEqual(input);
  });

  it('throws BusinessRuleViolationException when artist has 50 active artworks', async () => {
    mockRepo.count.mockResolvedValue(MAX_ACTIVE_ARTWORKS);
    const input = { artistId: 'a-1', title: 'Test' };
    await expect(pipe.transform(input)).rejects.toThrow(
      BusinessRuleViolationException,
    );

    try {
      await pipe.transform(input);
    } catch (e) {
      if (e instanceof BusinessRuleViolationException) {
        expect(e.rule).toBe('ARTWORK_LIMIT_EXCEEDED');
      }
    }
  });

  it('skips check when artistId is not provided', async () => {
    const input = { title: 'Test' };
    await expect(pipe.transform(input as any)).resolves.toEqual(input);
    expect(mockRepo.count).not.toHaveBeenCalled();
  });
});
