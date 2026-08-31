import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateExhibitionDto } from './create-exhibition.dto';

export class UpdateExhibitionDto extends PartialType(
  OmitType(CreateExhibitionDto, ['artworkIds'] as const),
) {}
