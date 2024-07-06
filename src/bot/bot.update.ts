import { Scenes, Telegraf } from 'telegraf'
import { Command, Ctx, Hears, InjectBot, Start, Update } from 'nestjs-telegraf'

import { ADD_WALLET_SCENE_ID, REMOVE_WALLET_SCENE_ID } from '@/app.constants'

import { MonitorService } from '@/monitor/monitor.service'

type Context = Scenes.WizardContext

@Update()
export class BotUpdate {
  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private monitorService: MonitorService
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply('Welcome')
  }

  @Command('add')
  async onAddCommand(@Ctx() ctx: Context) {
    await ctx.scene.enter(ADD_WALLET_SCENE_ID)
  }

  @Command('remove')
  async onRemoveCommand(@Ctx() ctx: Context) {
    await ctx.scene.enter(REMOVE_WALLET_SCENE_ID)
  }

  @Command('list')
  async onListCommand(@Ctx() ctx: Context) {
    const trackedWallets = await this.monitorService.getTelegramUserTrackedWallets(ctx.from)
    if (!!trackedWallets.length) {
      return trackedWallets.map(({ name, wallet }) => `${name} - ${wallet.address}`).join('\n')
    }

    return 'No wached wallet'
  }

  @Command('setMyCommands')
  async onSetCommands() {
    await this.bot.telegram.setMyCommands([
      { command: 'add', description: 'Add address' },
      { command: 'remove', description: 'Remove address' },
      { command: 'list', description: 'List tracked wallets' },
    ])
  }

  @Hears('Hi')
  async onHi() {
    return 'Hello'
  }
}
