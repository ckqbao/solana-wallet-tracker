import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import mongooseAutoPopulate = require('mongoose-autopopulate')

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { validateEnv } from './env'

import { BotModule } from './bot/bot.module'
import { DatabaseModule } from './database/database.module'
import { MigrateModule } from './migrate/migrate.module'
import { MonitorModule } from './monitor/monitor.module'
import { PaymentModule } from './payment/payment.module'

@Module({
  imports: [
    BotModule,
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    MigrateModule,
    MongooseModule.forRoot(process.env.DATABASE_URL!, {
      connectionFactory(connection) {
        connection.plugin(mongooseAutoPopulate)
        return connection
      },
    }),
    MonitorModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
