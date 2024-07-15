import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TelegrafModuleOptions, TelegrafOptionsFactory } from 'nestjs-telegraf'
import { session } from 'telegraf'

@Injectable()
export class BotConfigService implements TelegrafOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTelegrafOptions(): TelegrafModuleOptions {
    return {
      middlewares: [session()],
      token: this.configService.get('TELEGRAM_BOT_TOKEN')!,
    }
  }
}
