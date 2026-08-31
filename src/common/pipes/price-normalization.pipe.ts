import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PriceNormalizationPipe implements PipeTransform<number, number> {
  transform(value: number): number {
    const numericPrice = Number(value);

    if (isNaN(numericPrice)) {
      throw new BadRequestException('Price must be a valid number');
    }

    if (numericPrice < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    return Math.round(numericPrice * 100) / 100;
  }
}
