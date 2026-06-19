import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CurrentAccountsService } from './current-accounts.service';
import { CurrentAccountsController } from './current-accounts.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [CurrentAccountsController],
  providers: [CurrentAccountsService],
  exports: [CurrentAccountsService],
})
export class CurrentAccountsModule {}