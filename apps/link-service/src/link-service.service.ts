import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { Link } from './link.entity';
import { hashPassword } from './password';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 6;
const RESERVED = ['api'];
const MAX_URL_LENGTH = 2048;
const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 64;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

function isValidUrl(value: string): boolean {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface CreateLinkInput {
  url: string;
  alias?: string;
  expiresAt?: string;
  password?: string;
}

// ข้อมูลลิงก์ที่ส่งออกนอก service: ไม่มี hash ของรหัสผ่าน
// และไม่เปิดเผย URL ต้นทางของลิงก์ที่ตั้งรหัสผ่านไว้
export interface PublicLink {
  id: number;
  code: string;
  originalUrl: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  hasPassword: boolean;
}

function toPublic(link: Link): PublicLink {
  const hasPassword = link.passwordHash !== null;
  return {
    id: link.id,
    code: link.code,
    originalUrl: hasPassword ? null : link.originalUrl,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    hasPassword,
  };
}

function parseExpiry(value?: string): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const date = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    throw new BadRequestException('วันหมดอายุต้องเป็นเวลาในอนาคต');
  }
  return date;
}

async function parsePassword(value?: string): Promise<string | null> {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (
    typeof value !== 'string' ||
    value.length < MIN_PASSWORD_LENGTH ||
    value.length > MAX_PASSWORD_LENGTH
  ) {
    throw new BadRequestException(
      `รหัสผ่านต้องยาว ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} ตัวอักษร`,
    );
  }
  return hashPassword(value);
}

@Injectable()
export class LinkServiceService {
  constructor(
    @InjectRepository(Link) private readonly links: Repository<Link>,
  ) {}

  async create(input: CreateLinkInput): Promise<PublicLink> {
    const { url, alias } = input;
    if (!isValidUrl(url)) {
      throw new BadRequestException(
        'URL ต้องขึ้นต้นด้วย http:// หรือ https:// และยาวไม่เกิน 2048 ตัวอักษร',
      );
    }

    // ตัวเลือกเสริมทั้งสองอย่าง ถ้าไม่ส่งมาจะบันทึกเป็น null
    const options = {
      originalUrl: url,
      expiresAt: parseExpiry(input.expiresAt),
      passwordHash: await parsePassword(input.password),
    };

    if (alias) {
      if (
        typeof alias !== 'string' ||
        !/^[A-Za-z0-9_-]{3,10}$/.test(alias) ||
        RESERVED.includes(alias)
      ) {
        throw new BadRequestException(
          'alias ต้องเป็น a-z, A-Z, 0-9, _ หรือ - ยาว 3-10 ตัว',
        );
      }
      if (await this.links.findOneBy({ code: alias })) {
        throw new ConflictException('alias นี้ถูกใช้แล้ว');
      }
      return toPublic(
        await this.links.save(this.links.create({ code: alias, ...options })),
      );
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      if (!(await this.links.findOneBy({ code }))) {
        return toPublic(
          await this.links.save(this.links.create({ code, ...options })),
        );
      }
    }
    throw new InternalServerErrorException('สร้างรหัสไม่สำเร็จ กรุณาลองใหม่');
  }

  async findAll(): Promise<PublicLink[]> {
    const links = await this.links.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return links.map(toPublic);
  }

  async findOne(code: string): Promise<PublicLink> {
    const link = await this.links.findOneBy({ code });
    if (!link) {
      throw new NotFoundException('ไม่พบลิงก์นี้');
    }
    return toPublic(link);
  }
}
