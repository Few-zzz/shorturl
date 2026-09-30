import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnalyticsServiceService } from './analytics-service.service';

@Controller()
export class AnalyticsServiceController {
  constructor(private readonly analyticsServiceService: AnalyticsServiceService) {}

  @Post('clicks')
  record(
    @Body() body: { code?: string; referrer?: string; userAgent?: string },
  ) {
    return this.analyticsServiceService.record(
      body?.code,
      body?.referrer,
      body?.userAgent,
    );
  }

  @Get('stats')
  summary() {
    return this.analyticsServiceService.summary();
  }

  @Get('stats/:code')
  statsFor(@Param('code') code: string) {
    return this.analyticsServiceService.statsFor(code);
  }
}
