import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ActionTypesModule } from './action-types/action-types.module';
import { ReceiptMethodsModule } from './receipt-methods/receipt-methods.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { CurrentAccountsModule } from './current-accounts/current-accounts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SuppliersModule,
    ActionTypesModule,
    ReceiptMethodsModule,
    ReceivablesModule,
    ReceiptsModule,
    CurrentAccountsModule,
    DashboardModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limit global (login tem limite mais estrito via @Throttle).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Autenticação global (rotas liberadas com @Public).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Autorização por perfil (ativada por @Roles).
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
