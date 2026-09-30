import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBuffer, toString as toSvg } from 'qrcode';

type ServiceName =
  | 'LINK_SERVICE_URL'
  | 'REDIRECT_SERVICE_URL'
  | 'ANALYTICS_SERVICE_URL';

export type QrFormat = 'svg' | 'png';

export interface UpstreamResult {
  status: number;
  body: unknown;
  location?: string;
}

// service ฟรีบน Render ใช้เวลาตื่นประมาณหนึ่งนาที จึงให้เวลารอทั่วไปนานกว่านั้น
const DEFAULT_TIMEOUT_MS = 100_000;
// จำนวนคลิกเป็นข้อมูลเสริม ถ้า Analytics ช้าให้แสดงรายการลิงก์ไปก่อน
const STATS_TIMEOUT_MS = 3_000;

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,10}$/;

const UNAVAILABLE: UpstreamResult = {
  status: 503,
  body: { statusCode: 503, message: 'service ปลายทางไม่พร้อมใช้งาน' },
};

export const NOT_FOUND: UpstreamResult = {
  status: 404,
  body: { statusCode: 404, error: 'Not Found', message: 'ไม่พบลิงก์นี้' },
};

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  isValidCode(code: string): boolean {
    return CODE_PATTERN.test(code);
  }

  async request(
    service: ServiceName,
    path: string,
    init?: RequestInit,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<UpstreamResult> {
    try {
      const baseUrl = this.config.getOrThrow<string>(service);
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body: unknown = await response.json().catch(() => null);
      return {
        status: response.status,
        body,
        location: response.headers.get('location') ?? undefined,
      };
    } catch {
      return UNAVAILABLE;
    }
  }

  createLink(payload: unknown): Promise<UpstreamResult> {
    return this.request('LINK_SERVICE_URL', '/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
  }

  findLink(code: string): Promise<UpstreamResult> {
    return this.request('LINK_SERVICE_URL', `/links/${code}`);
  }

  async listLinksWithClicks(): Promise<UpstreamResult> {
    const [links, stats] = await Promise.all([
      this.request('LINK_SERVICE_URL', '/links'),
      this.request('ANALYTICS_SERVICE_URL', '/stats', undefined, STATS_TIMEOUT_MS),
    ]);
    if (links.status !== 200 || !Array.isArray(links.body)) {
      return links;
    }

    // ถ้า Analytics ล่มหรือช้า ยังแสดงรายการลิงก์ได้ โดยจำนวนคลิกเป็น null (ไม่ทราบ)
    const statsAvailable = stats.status === 200 && Array.isArray(stats.body);
    const clicks = new Map<string, number>();
    if (statsAvailable) {
      for (const row of stats.body as { code: string; clicks: number }[]) {
        clicks.set(row.code, row.clicks);
      }
    }

    const body = (links.body as { code: string }[]).map((link) => ({
      ...link,
      clicks: statsAvailable ? (clicks.get(link.code) ?? 0) : null,
    }));
    return { status: 200, body };
  }

  statsFor(code: string): Promise<UpstreamResult> {
    return this.request('ANALYTICS_SERVICE_URL', `/stats/${code}`);
  }

  resolveRedirect(
    code: string,
    referrer?: string,
    userAgent?: string,
  ): Promise<UpstreamResult> {
    const headers: Record<string, string> = {};
    if (referrer) {
      headers['referer'] = referrer;
    }
    if (userAgent) {
      headers['user-agent'] = userAgent;
    }
    return this.request('REDIRECT_SERVICE_URL', `/${code}`, {
      redirect: 'manual',
      headers,
    });
  }

  // ใช้โดเมนจากค่าตั้งค่าเท่านั้น ไม่อ่านจาก Host header ของ request
  // เพื่อไม่ให้ผู้โจมตีปลอม header แล้วได้ QR ที่ชี้ไปโดเมนอื่น
  // บน Render ถ้าไม่ได้ตั้ง PUBLIC_BASE_URL จะใช้ RENDER_EXTERNAL_URL ที่ Render กำหนดให้
  shortUrl(code: string): string {
    const baseUrl =
      this.config.get<string>('PUBLIC_BASE_URL') ||
      this.config.get<string>('RENDER_EXTERNAL_URL') ||
      'http://localhost:3000';
    return `${baseUrl.replace(/\/+$/, '')}/${code}`;
  }

  qrImage(code: string, format: QrFormat): Promise<string | Buffer> {
    const options = { errorCorrectionLevel: 'M', margin: 2, width: 320 } as const;
    const text = this.shortUrl(code);
    return format === 'png'
      ? toBuffer(text, { ...options, type: 'png' })
      : toSvg(text, { ...options, type: 'svg' });
  }
}
