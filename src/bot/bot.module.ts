import { Module, forwardRef } from '@nestjs/common';

import { MonitorModule } from '@/monitor/monitor.module';

import { BotService } from './bot.service';

@Module({
  imports: [forwardRef(() => MonitorModule)],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
