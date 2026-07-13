import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('artists')
export class Artist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ type: 'int', nullable: true })
  birthYear: number;

  @Column({ nullable: true })
  specialty: string;

  @Column({ nullable: true })
  websiteUrl: string;

  @Index()
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  entryDate: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'galleryId' })
  gallery: User;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
