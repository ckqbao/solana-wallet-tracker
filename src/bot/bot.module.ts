import { Module, forwardRef } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';

import { MonitorModule } from '@/monitor/monitor.module';

import { AddWalletScene } from './scenes/add-wallet.scene';
import { BotConfigService } from './bot-config.service';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { RemoveWalletScene } from './scenes/remove-wallet.scene';

@Module({
  imports: [
    forwardRef(() => MonitorModule),
    TelegrafModule.forRootAsync({
      useClass: BotConfigService,
    }),
  ],
  providers: [AddWalletScene, BotService, BotUpdate, RemoveWalletScene],
  exports: [BotService],
})
export class BotModule {}
