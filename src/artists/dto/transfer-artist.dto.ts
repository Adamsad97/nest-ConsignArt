import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferArtistDto {
  @ApiProperty({
    description: 'ID of the gallery user the artist is transferred to',
  })
  @IsUUID()
  galleryId: string;
}
