import { Module } from '@nestjs/common';
import { ReceiptMethodsService } from './receipt-methods.service';
import { ReceiptMethodsController } from './receipt-methods.controller';

@Module({
  controllers: [ReceiptMethodsController],
  providers: [ReceiptMethodsService],
})
export class ReceiptMethodsModule {}
