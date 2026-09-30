import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LinkServiceService } from './link-service.service';

@Controller('links')
export class LinkServiceController {
  constructor(private readonly linkServiceService: LinkServiceService) {}

  @Post()
  create(@Body() body: { url?: string; alias?: string }) {
    return this.linkServiceService.create(body?.url ?? '', body?.alias);
  }

  @Get()
  findAll() {
    return this.linkServiceService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.linkServiceService.findOne(code);
  }
}
