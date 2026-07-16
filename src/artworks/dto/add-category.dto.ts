import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCategoryDto {
  @ApiProperty({ description: 'UUID of the category to attach' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
