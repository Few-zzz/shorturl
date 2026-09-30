import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link.entity';
import { LinkServiceController } from './link-service.controller';
import { LinkServiceService } from './link-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [Link],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([Link]),
  ],
  controllers: [LinkServiceController],
  providers: [LinkServiceService],
})
export class LinkServiceModule {}
