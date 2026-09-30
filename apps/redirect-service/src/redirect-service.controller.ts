import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Redirect,
} from '@nestjs/common';
import { RedirectServiceService } from './redirect-service.service';

@Controller()
export class RedirectServiceController {
  constructor(private readonly redirectServiceService: RedirectServiceService) {}

  // ลิงก์ที่ตั้งรหัสผ่าน: ส่งรหัสมาตรวจ ถ้าถูกจึงได้ URL ต้นทางและนับเป็นการคลิก
  @Post(':code/unlock')
  @HttpCode(200)
  async unlock(
    @Param('code') code: string,
    @Body() body: { password?: string },
    @Headers('referer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const password = typeof body?.password === 'string' ? body.password : '';
    const url = await this.redirectServiceService.unlock(code, password);
    this.redirectServiceService.trackClick(code, referrer, userAgent);
    return { url };
  }

  @Get(':code')
  @Redirect()
  async redirect(
    @Param('code') code: string,
    @Headers('referer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const url = await this.redirectServiceService.resolve(code);
    this.redirectServiceService.trackClick(code, referrer, userAgent);
    return { url, statusCode: 302 };
  }
}
