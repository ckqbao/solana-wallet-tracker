import { Module, forwardRef } from '@nestjs/common';

import { BotModule } from '@/bot/bot.module';

import { MonitorService } from './monitor.service';
import { MonitorController } from './monitor.controller';

@Module({
  imports: [forwardRef(() => BotModule)],
  controllers: [MonitorController],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {}
