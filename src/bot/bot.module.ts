import { Module, forwardRef } from '@nestjs/common'
import { TelegrafModule } from 'nestjs-telegraf'

import { MonitorModule } from '@/monitor/monitor.module'
import { PaymentModule } from '@/payment/payment.module'

import { SetMainWalletScene } from './scenes/set-main-wallet.scene'
import { TrackWalletScene } from './scenes/track-wallet.scene'
import { UntrackWalletScene } from './scenes/untrack-wallet.scene'
import { WalletSettingsScene } from './scenes/wallet-settings.scene'

import { BotConfigService } from './bot-config.service'
import { BotUpdate } from './bot.update'
import { BotService } from './bot.service'

@Module({
  imports: [
    forwardRef(() => MonitorModule),
    PaymentModule,
    TelegrafModule.forRootAsync({
      useClass: BotConfigService,
    }),
  ],
  providers: [SetMainWalletScene, TrackWalletScene, BotService, BotUpdate, UntrackWalletScene, WalletSettingsScene],
  exports: [BotService],
})
export class BotModule {}
