import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExhibitionDto } from './create-exhibition.dto';

describe('CreateExhibitionDto', () => {
  const base = {
    title: 'Modern Masters',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  };

  it('rejects creation with zero artworks', async () => {
    const dto = plainToInstance(CreateExhibitionDto, {
      ...base,
      artworkIds: [],
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'artworkIds',
          constraints: expect.objectContaining({
            arrayMinSize: expect.any(String),
          }),
        }),
      ]),
    );
  });

  it('accepts creation with at least one artwork', async () => {
    const dto = plainToInstance(CreateExhibitionDto, {
      ...base,
      artworkIds: ['11111111-1111-4111-8111-111111111111'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
