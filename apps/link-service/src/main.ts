import { NestFactory } from '@nestjs/core';
import { LinkServiceModule } from './link-service.module';

async function bootstrap() {
  const app = await NestFactory.create(LinkServiceModule);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
