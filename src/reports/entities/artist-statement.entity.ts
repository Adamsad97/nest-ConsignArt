import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';
import { User } from '../../users/entities/user.entity';

@Entity('artist_statements')
export class ArtistStatement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  period: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'int', default: 0 })
  totalSalesCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSaleAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  items: Record<string, unknown>[];

  @Column({ type: 'date' })
  generatedAt: Date;

  @ManyToOne(() => Artist, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'galleryId' })
  gallery: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generatedById' })
  generatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
