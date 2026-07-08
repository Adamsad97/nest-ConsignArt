import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExhibitionArtwork } from './exhibition-artwork.entity';
import { ExhibitionStatus } from './enums/exhibition-status.enum';

@Entity('exhibitions')
export class Exhibition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  virtualLink: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: ExhibitionStatus,
    default: ExhibitionStatus.UPCOMING,
  })
  status: ExhibitionStatus;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'galleryId' })
  gallery: User;

  @OneToMany(() => ExhibitionArtwork, (ea) => ea.exhibition, { cascade: true })
  exhibitionArtworks: ExhibitionArtwork[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
