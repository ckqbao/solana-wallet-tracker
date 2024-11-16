import { Inject, UseFilters } from '@nestjs/common'
import { Action, Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { WizardContext } from 'telegraf/typings/scenes'

import { PAUSE_WALLET_SCENE_ID } from '@/app.constants'
import { TelegrafExceptionFilter } from '@/common/filters/telegraf-exception.filter'
import { validateSolanaAddress } from '@/utils/validate-wallet'

import { MonitorService } from '@/monitor/monitor.service'
import { BaseScene } from './base.scene'

@Wizard(PAUSE_WALLET_SCENE_ID)
@UseFilters(TelegrafExceptionFilter)
export class PauseWalletScene extends BaseScene {
  @Inject()
  private monitorService: MonitorService

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    const { from } = ctx
    if (!from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }
    const trackedWallets = await this.monitorService.getTelegramUserTrackedWallets(from)
    if (!trackedWallets.length) {
      await ctx.scene.leave()
      return 'You have no tracked wallet to pause'
    }
    await ctx.reply(
      'Pause by address or wallet name ?',
      Markup.inlineKeyboard([Markup.button.callback('Address', 'address'), Markup.button.callback('Wallet name', 'walletName')])
    )
    ctx.wizard.next()
  }

  @Action(/address|walletName/)
  @WizardStep(2)
  async onRemoveByAddress(@Ctx() ctx: WizardContext & { update: Update.CallbackQueryUpdate }) {
    const cbQuery = ctx.update.callback_query
    const pausedBy = 'data' in cbQuery ? cbQuery.data : null
    // @ts-ignore
    ctx.wizard.state['pausedBy'] = pausedBy
    switch (pausedBy) {
      case 'address':
        ctx.wizard.next()
        return 'Enter the address:'
      case 'walletName':
        ctx.wizard.next()
        return 'Enter the wallet name:'
      default:
        ctx.scene.reset()
    }
  }

  @On('text')
  @WizardStep(3)
  async onRemove(@Ctx() ctx: WizardContext & { wizard: { state: { pausedBy: string } } }, @Message() msg: { text: string }) {
    const { from } = ctx
    if (!from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }

    const pausedBy = ctx.wizard.state.pausedBy
    if (pausedBy === 'address' && !validateSolanaAddress(msg.text)) {
      return 'Please enter a valid address.'
    }

    const wallet: Partial<{ address: string; name: string }> = {}
    // @ts-ignore
    if (pausedBy === 'address') wallet.address = ctx.message['text'] as string
    // @ts-ignore
    if (pausedBy === 'walletName') wallet.name = ctx.message['text'] as string

    try {
      await this.monitorService.pauseWallet(from, wallet)
    } catch {
      await ctx.scene.leave()
      return 'Unexpected error.'
    }
    await ctx.scene.leave()
    return `Wallet ${wallet.name || wallet.address} has been paused successfully.`
  }
}
