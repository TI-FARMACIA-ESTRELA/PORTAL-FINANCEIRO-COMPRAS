import { Module } from '@nestjs/common';
import { ActionTypesService } from './action-types.service';
import { ActionTypesController } from './action-types.controller';

@Module({
  controllers: [ActionTypesController],
  providers: [ActionTypesService],
})
export class ActionTypesModule {}
