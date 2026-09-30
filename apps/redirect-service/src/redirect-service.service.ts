import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Link } from './link.entity';

@Injectable()
export class RedirectServiceService {
  private readonly logger = new Logger(RedirectServiceService.name);

  constructor(
    @InjectRepository(Link) private readonly links: Repository<Link>,
    private readonly config: ConfigService,
  ) {}

  async resolve(code: string): Promise<string> {
    const link = await this.links.findOneBy({ code });
    if (!link) {
      throw new NotFoundException('ไม่พบลิงก์นี้');
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
