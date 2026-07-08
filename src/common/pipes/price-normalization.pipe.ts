import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PriceNormalizationPipe implements PipeTransform<number, number> {
  transform(value: number): number {
    const num = Number(value);

    if (isNaN(num)) {
      throw new BadRequestException('Price must be a valid number');
    }

    if (num < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    return Math.round(num * 100) / 100;
  }
}
