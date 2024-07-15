import { forwardRef, Module } from '@nestjs/common'
import { PaymentService } from './payment.service'

import { MonitorModule } from '@/monitor/monitor.module'

@Module({
  imports: [forwardRef(() => MonitorModule)],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
