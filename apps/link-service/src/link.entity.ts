import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('links')
export class Link {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ name: 'original_url', type: 'text' })
  originalUrl!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // ตัวเลือกเสริม: เป็น null เมื่อผู้สร้างลิงก์ไม่ได้เลือกใช้
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash!: string | null;
}
