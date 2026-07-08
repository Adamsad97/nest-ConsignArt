import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Exhibition } from './exhibition.entity';
import { Artwork } from '../../artworks/entities/artwork.entity';

@Entity('exhibition_artworks')
@Unique(['exhibition', 'artwork'])
export class ExhibitionArtwork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exhibition, (exhibition) => exhibition.exhibitionArtworks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exhibitionId' })
  exhibition: Exhibition;

  @ManyToOne(() => Artwork, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'artworkId' })
  artwork: Artwork;

  @Column({ type: 'int', nullable: true })
  displayOrder: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  addedAt: Date;
}
