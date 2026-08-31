import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
  JoinColumn,
} from 'typeorm';
import { ArtworkStatus } from '../enums/artwork-status.enum';
import { User } from '../../users/entities/user.entity';
import { Artist } from '../../artists/entities/artist.entity';
import { ArtworkStatusHistory } from './artwork-status-history.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('artworks')
export class Artwork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  technique: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  width: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  depth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reservePrice: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ArtworkStatus,
    default: ArtworkStatus.AVAILABLE,
  })
  status: ArtworkStatus;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  consignmentDate: Date;

  @ManyToOne(() => Artist, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: false,
  })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @ManyToOne(() => User, (user) => user.artworks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'galleryId' })
  gallery: User;

  @OneToMany(() => ArtworkStatusHistory, (history) => history.artwork)
  statusHistory: ArtworkStatusHistory[];

  @ManyToMany(() => Category, (category) => category.artworks)
  @JoinTable({
    name: 'artwork_categories',
    joinColumn: { name: 'artworkId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
