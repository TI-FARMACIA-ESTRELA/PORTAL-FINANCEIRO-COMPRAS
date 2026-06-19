import { Module } from '@nestjs/common';
import { ReceivablesModule } from '../receivables/receivables.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { CurrentAccountsModule } from '../current-accounts/current-accounts.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ReceivablesModule, ReceiptsModule, CurrentAccountsModule, DashboardModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
