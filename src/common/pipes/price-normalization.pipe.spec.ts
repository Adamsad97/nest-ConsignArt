import { BadRequestException } from '@nestjs/common';
import { PriceNormalizationPipe } from './price-normalization.pipe';

describe('PriceNormalizationPipe', () => {
  let pipe: PriceNormalizationPipe;

  beforeEach(() => {
    pipe = new PriceNormalizationPipe();
  });

  it('rounds to 2 decimal places (round up)', () => {
    expect(pipe.transform(15000.256)).toBe(15000.26);
  });

  it('rounds to 2 decimal places (round down)', () => {
    expect(pipe.transform(5000.994)).toBe(5000.99);
  });

  it('keeps integer prices unchanged', () => {
    expect(pipe.transform(1000)).toBe(1000);
  });

  it('allows zero price', () => {
    expect(pipe.transform(0)).toBe(0);
  });

  it('throws BadRequestException for negative prices', () => {
    expect(() => pipe.transform(-100)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for NaN', () => {
    expect(() => pipe.transform(NaN)).toThrow(BadRequestException);
  });
});
