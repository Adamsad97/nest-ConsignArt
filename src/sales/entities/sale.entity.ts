import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { User } from '../../users/entities/user.entity';
import { Invoice } from './invoice.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buyer: string;

  @Column()
  buyerContact: string;

  @Column({ type: 'date' })
  saleDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  salePrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  galleryCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  artistAmount: number;

  @OneToOne(() => Artwork, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'artworkId' })
  artwork: Artwork;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'galleryId' })
  gallery: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyerAccountId' })
  buyerAccount: User | null;

  @OneToOne(() => Invoice, (invoice) => invoice.sale, { cascade: true })
  invoice: Invoice;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
