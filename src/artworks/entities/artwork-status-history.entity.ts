import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Artwork } from './artwork.entity';
import { ArtworkStatus } from '../enums/artwork-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('artwork_status_history')
export class ArtworkStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ArtworkStatus, nullable: true })
  previousStatus: ArtworkStatus | null;

  @Column({ type: 'enum', enum: ArtworkStatus })
  newStatus: ArtworkStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @ManyToOne(() => Artwork, (artwork) => artwork.statusHistory, {
    onDelete: 'CASCADE',
  })
  artwork: Artwork;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  changedBy: User;

  @CreateDateColumn()
  changedAt: Date;
}
