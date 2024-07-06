import { Module } from '@nestjs/common'
import { MigrateService } from './migrate.service'
import { MonitorModule } from '@/monitor/monitor.module'

@Module({
  imports: [MonitorModule],
  providers: [MigrateService],
})
export class MigrateModule {}
