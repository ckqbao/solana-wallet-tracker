import { Action, Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { WizardContext } from 'telegraf/typings/scenes'

import { RESUME_WALLET_SCENE_ID } from '@/app.constants'
import { validateSolanaAddress } from '@/utils/validate-wallet'

import { MonitorService } from '@/monitor/monitor.service'

import { BaseScene } from './base.scene'
import { Inject, UseFilters } from '@nestjs/common'
import { TelegrafExceptionFilter } from '@/common/filters/telegraf-exception.filter'

@Wizard(RESUME_WALLET_SCENE_ID)
@UseFilters(TelegrafExceptionFilter)
export class ResumeWalletScene extends BaseScene {
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
      return 'You have no tracked wallet to resume'
    }
    await ctx.reply(
      'Resume by address or wallet name ?',
      Markup.inlineKeyboard([Markup.button.callback('Address', 'address'), Markup.button.callback('Wallet name', 'walletName')])
    )
    ctx.wizard.next()
  }

  @Action(/address|walletName/)
  @WizardStep(2)
  async onRemoveByAddress(@Ctx() ctx: WizardContext & { update: Update.CallbackQueryUpdate }) {
    const cbQuery = ctx.update.callback_query
    const resumedBy = 'data' in cbQuery ? cbQuery.data : null
    // @ts-ignore
    ctx.wizard.state['resumedBy'] = resumedBy
    switch (resumedBy) {
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
  async onRemove(@Ctx() ctx: WizardContext & { wizard: { state: { resumedBy: string } } }, @Message() msg: { text: string }) {
    const { from } = ctx
    if (!from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }

    const resumedBy = ctx.wizard.state.resumedBy
    if (resumedBy === 'address' && !validateSolanaAddress(msg.text)) {
      return 'Please enter a valid address.'
    }

    const wallet: Partial<{ address: string; name: string }> = {}
    // @ts-ignore
    if (resumedBy === 'address') wallet.address = ctx.message['text'] as string
    // @ts-ignore
    if (resumedBy === 'walletName') wallet.name = ctx.message['text'] as string

    try {
      await this.monitorService.resumeWallet(from, wallet)
    } catch {
      await ctx.scene.leave()
      return 'Unexpected error.'
    }
    await ctx.scene.leave()
    return `Wallet ${wallet.name || wallet.address} has been resumed successfully.`
  }
}
