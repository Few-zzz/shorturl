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

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 6;
const RESERVED = ['api'];
const MAX_URL_LENGTH = 2048;

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

@Injectable()
export class LinkServiceService {
  constructor(
    @InjectRepository(Link) private readonly links: Repository<Link>,
  ) {}

  async create(url: string, alias?: string): Promise<Link> {
    if (!isValidUrl(url)) {
      throw new BadRequestException(
        'URL ต้องขึ้นต้นด้วย http:// หรือ https:// และยาวไม่เกิน 2048 ตัวอักษร',
      );
    }

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
      return this.links.save(this.links.create({ code: alias, originalUrl: url }));
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      if (!(await this.links.findOneBy({ code }))) {
        return this.links.save(this.links.create({ code, originalUrl: url }));
      }
    }
    throw new InternalServerErrorException('สร้างรหัสไม่สำเร็จ กรุณาลองใหม่');
  }

  findAll(): Promise<Link[]> {
    return this.links.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async findOne(code: string): Promise<Link> {
    const link = await this.links.findOneBy({ code });
    if (!link) {
      throw new NotFoundException('ไม่พบลิงก์นี้');
    }
    return link;
  }
}
