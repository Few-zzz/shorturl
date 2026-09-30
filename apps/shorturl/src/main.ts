import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

// หน้าเว็บอยู่นอกผลลัพธ์ของการ build จึงอ้างจากโฟลเดอร์หลักของโปรเจกต์
// ทั้ง `nest start` บนเครื่องและ start command บน Render รันจากโฟลเดอร์หลักเหมือนกัน
const PUBLIC_DIR = join(process.cwd(), 'apps', 'shorturl', 'public');

// อนุญาตเฉพาะไฟล์สคริปต์ สไตล์ และรูปจากโดเมนของระบบเอง
// สคริปต์ที่ถูกแทรกเข้ามาในหน้า (XSS) จะไม่ถูก browser รัน
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

async function bootstrap() {
  if (!existsSync(join(PUBLIC_DIR, 'index.html'))) {
    throw new Error(
      `ไม่พบหน้าเว็บที่ ${PUBLIC_DIR} ต้องเริ่ม gateway จากโฟลเดอร์หลักของโปรเจกต์`,
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.useStaticAssets(PUBLIC_DIR);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
