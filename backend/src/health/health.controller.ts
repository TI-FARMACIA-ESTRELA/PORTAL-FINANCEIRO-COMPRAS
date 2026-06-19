import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const dbHealthy = await this.prisma.isHealthy();
    const body = {
      status: dbHealthy ? 'ok' : 'degraded',
      service: 'portal-financeiro-comercial-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'up' : 'down',
    };

    if (!dbHealthy) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return body;
  }
}
