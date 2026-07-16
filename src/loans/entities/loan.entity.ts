import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { User } from '../../users/entities/user.entity';
import { LoanStatus } from './enums/loan-status.enum';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  purpose: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  expectedReturnDate: Date;

  @Column({ type: 'date', nullable: true })
  actualReturnDate: Date;

  @Column({ type: 'text', nullable: true })
  conditions: string;

  @Index()
  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status: LoanStatus;

  @ManyToOne(() => Artwork, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'artworkId' })
  artwork: Artwork;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'galleryId' })
  gallery: User;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'borrowerGalleryId' })
  borrowerGallery: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
