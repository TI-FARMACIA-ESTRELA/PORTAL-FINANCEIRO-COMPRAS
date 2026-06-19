import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Conectado ao PostgreSQL via Prisma');
    } catch (error) {
      // Na Fase 1 o banco pode ainda não estar disponível em todos os cenários.
      // Não derrubamos a aplicação para permitir o healthcheck visual.
      this.logger.warn(
        `Não foi possível conectar ao banco no boot: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Verifica conectividade real com o banco (usado no healthcheck). */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
