import {
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Link } from './link.entity';
import { verifyPassword } from './password';

@Injectable()
export class RedirectServiceService {
  private readonly logger = new Logger(RedirectServiceService.name);

  constructor(
    @InjectRepository(Link) private readonly links: Repository<Link>,
    private readonly config: ConfigService,
  ) {}

  // คืนลิงก์ที่ยังใช้งานได้ ถ้าไม่มีตอบ 404 ถ้าหมดอายุแล้วตอบ 410
  private async findActive(code: string): Promise<Link> {
    const link = await this.links.findOneBy({ code });
    if (!link) {
      throw new NotFoundException('ไม่พบลิงก์นี้');
    }
    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('ลิงก์นี้หมดอายุแล้ว');
    }
    return link;
  }

  async resolve(code: string): Promise<string> {
    const link = await this.findActive(code);
    if (link.passwordHash) {
      // ไม่เปิดเผย URL ต้นทางจนกว่าจะส่งรหัสผ่านที่ถูกต้องมาทาง unlock
      throw new UnauthorizedException('ลิงก์นี้ต้องใช้รหัสผ่าน');
    }
    return link.originalUrl;
  }

  async unlock(code: string, password: string): Promise<string> {
    const link = await this.findActive(code);
    if (
      link.passwordHash &&
      !(await verifyPassword(password, link.passwordHash))
    ) {
      throw new ForbiddenException('รหัสผ่านไม่ถูกต้อง');
    }
    return link.originalUrl;
  }

  trackClick(code: string, referrer?: string, userAgent?: string): void {
    const baseUrl = this.config.get<string>('ANALYTICS_SERVICE_URL');
    if (!baseUrl) {
      return;
    }
    fetch(`${baseUrl}/clicks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, referrer, userAgent }),
    }).catch((error: Error) => {
      this.logger.warn(`บันทึกการคลิกไม่สำเร็จ: ${error.message}`);
    });
  }
}
