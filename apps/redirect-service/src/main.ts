import { NestFactory } from '@nestjs/core';
import { RedirectServiceModule } from './redirect-service.module';

async function bootstrap() {
  const app = await NestFactory.create(RedirectServiceModule);
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
