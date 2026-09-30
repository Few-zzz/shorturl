import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppService, NOT_FOUND } from './app.service';
import { PAGE_CSP, PAGE_HTML } from './page';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', PAGE_CSP)
  page(): string {
    return PAGE_HTML;
  }

  @Post('api/links')
  async createLink(@Body() body: unknown, @Res() res: Response) {
    const result = await this.appService.createLink(body);
    res.status(result.status).json(result.body);
  }

  @Get('api/links')
  async listLinks(@Res() res: Response) {
    const result = await this.appService.listLinksWithClicks();
    res.status(result.status).json(result.body);
  }

  @Get('api/stats/:code')
  async statsFor(@Param('code') code: string, @Res() res: Response) {
    const result = this.appService.isValidCode(code)
      ? await this.appService.statsFor(code)
      : NOT_FOUND;
    res.status(result.status).json(result.body);
  }

  @Get('api/qr/:code')
  async qr(
    @Param('code') code: string,
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    // สร้าง QR ให้เฉพาะรหัสที่มีอยู่จริง ไม่รับข้อความอื่นมาแปลงเป็น QR
    const link = this.appService.isValidCode(code)
      ? await this.appService.findLink(code)
      : NOT_FOUND;
    if (link.status !== 200) {
      res.status(link.status).json(link.body);
      return;
    }

    const isPng = format === 'png';
    const image = await this.appService.qrImage(code, isPng ? 'png' : 'svg');
    res.setHeader('Content-Type', isPng ? 'image/png' : 'image/svg+xml');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (isPng) {
      res.setHeader('Content-Disposition', `attachment; filename="qr-${code}.png"`);
    }
    res.send(image);
  }

  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Res() res: Response,
    @Headers('referer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = this.appService.isValidCode(code)
      ? await this.appService.resolveRedirect(code, referrer, userAgent)
      : NOT_FOUND;
    if (result.status === 302 && result.location) {
      res.redirect(302, result.location);
      return;
    }
    res.status(result.status).json(result.body);
  }
}
