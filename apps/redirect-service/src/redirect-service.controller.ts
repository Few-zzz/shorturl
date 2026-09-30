import { Controller, Get, Headers, Param, Redirect } from '@nestjs/common';
import { RedirectServiceService } from './redirect-service.service';

@Controller()
export class RedirectServiceController {
  constructor(private readonly redirectServiceService: RedirectServiceService) {}

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
