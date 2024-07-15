import { UseFilters, UseGuards } from '@nestjs/common'
import { Telegraf } from 'telegraf'
import { plainToInstance } from 'class-transformer'
import { Command, Ctx, Hears, InjectBot, Start, Update } from 'nestjs-telegraf'

import { SET_MAIN_WALLET_SCENE_ID, TRACK_WALLET_SCENE_ID, UNTRACK_WALLET_SCENE_ID, WALLET_SETTINGS } from '@/app.constants'

import { MonitorService } from '@/monitor/monitor.service'
import { UserRepository } from '@/database/repository/user.repository'
import { WalletRepository } from '@/database/repository/wallet.repository'

import { CreateUserDto } from '@/database/dto/create-user.dto'
import { Context } from './interfaces/context.interface'
import { RoleGuard, RoleGuardOptions } from '@/authz/guards/role.guard'
import { RoleEnum } from '@/authz/enums/role.enum'
import { TelegrafExceptionFilter } from '@/common/filters/telegraf-exception.filter'
import { SubscriptionGuard } from '@/payment/guards/subscription.guard'
import _ from 'lodash'

@Update()
@UseFilters(TelegrafExceptionFilter)
export class BotUpdate {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly monitorService: MonitorService,
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, ctx.from))
    await ctx.reply(
      `Welcome ${_.trim(`${ctx.from?.first_name ?? ''} ${ctx.from?.last_name ?? ''}`)},\n` +
        `You can experience our tracking bot in ${user.freeTrial.duration} ${user.freeTrial.durationUnit}.\n` +
        'After that, if you want to continue to use it, please subscribe. Read instructions via command /subscribe.'
    )
  }

  @Command('setmainwallet')
  @UseGuards(RoleGuard)
  @RoleGuardOptions([RoleEnum.ADMIN])
  async onAddReceivingMoneyWallet(@Ctx() ctx: Context) {
    await ctx.scene.enter(SET_MAIN_WALLET_SCENE_ID)
  }

  @Command('track')
  @UseGuards(SubscriptionGuard)
  async onAddCommand(@Ctx() ctx: Context) {
    await ctx.scene.enter(TRACK_WALLET_SCENE_ID)
  }

  @Command('untrack')
  @UseGuards(SubscriptionGuard)
  async onUntrackCommand(@Ctx() ctx: Context) {
    await ctx.scene.enter(UNTRACK_WALLET_SCENE_ID)
  }

  @Command('list')
  @UseGuards(SubscriptionGuard)
  async onListCommand(@Ctx() ctx: Context) {
    const { from } = ctx
    if (!from) {
      return 'Unexpected error'
    }
    const trackedWallets = await this.monitorService.getTelegramUserTrackedWallets(from)
    if (!!trackedWallets.length) {
      return trackedWallets.map(({ name, wallet }) => `${name} - ${wallet.address}`).join('\n')
    }

    return 'No wached wallet'
  }

  @Command('subscribe')
  async onSubscribeCommand(@Ctx() ctx: Context) {
    const wallet = await this.walletRepository.getMainWallet()
    await ctx.sendMessage('Use one of the wallets that you setup via command /wallet to send 0.2 SOL to address ' + '`' + wallet.address + '`', {
      parse_mode: 'Markdown',
    })
  }

  @Command('setmycommands')
  @UseGuards(RoleGuard)
  @RoleGuardOptions([RoleEnum.ADMIN])
  async onSetCommands() {
    await this.bot.telegram.setMyCommands([
      { command: 'list', description: 'List tracked wallets' },
      { command: 'subscribe', description: 'Subscribe to use bot' },
      { command: 'track', description: 'Track address' },
      { command: 'untrack', description: 'Untrack address' },
      { command: 'wallet', description: 'Setup wallets' },
    ])
  }

  @Command('wallet')
  async onSetupWallet(@Ctx() ctx: Context) {
    await ctx.scene.enter(WALLET_SETTINGS)
  }

  @Hears('Hi')
  async onHi() {
    return 'Hello'
  }
}
