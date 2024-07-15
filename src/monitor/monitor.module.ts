import { Module, forwardRef } from '@nestjs/common'

import { BotModule } from '@/bot/bot.module'
import { PaymentModule } from '@/payment/payment.module'

import { MonitorService } from './monitor.service'
import { MonitorController } from './monitor.controller'
import { shyftSdkProvider } from './shyft-sdk.provider'

@Module({
  imports: [forwardRef(() => BotModule), forwardRef(() => PaymentModule)],
  controllers: [MonitorController],
  providers: [MonitorService, shyftSdkProvider],
  exports: [MonitorService, shyftSdkProvider],
})
export class MonitorModule {}
