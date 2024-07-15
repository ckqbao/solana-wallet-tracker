import { Action, Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { WizardContext } from 'telegraf/typings/scenes'

import { UNTRACK_WALLET_SCENE_ID } from '@/app.constants'
import { validateSolanaAddress } from '@/utils/validate-wallet'

import { MonitorService } from '@/monitor/monitor.service'

@Wizard(UNTRACK_WALLET_SCENE_ID)
export class UntrackWalletScene {
  constructor(private monitorService: MonitorService) {}

  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave()
    return 'cancelled'
  }

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
      return 'You have no tracked wallet to remove'
    }
    await ctx.reply(
      'Remove by address or wallet name ?',
      Markup.inlineKeyboard([Markup.button.callback('Address', 'address'), Markup.button.callback('Wallet name', 'walletName')])
    )
    ctx.wizard.next()
  }

  @Action(/address|walletName/)
  @WizardStep(2)
  async onRemoveByAddress(@Ctx() ctx: WizardContext & { update: Update.CallbackQueryUpdate }) {
    const cbQuery = ctx.update.callback_query
    const removedBy = 'data' in cbQuery ? cbQuery.data : null
    // @ts-ignore
    ctx.wizard.state['removedBy'] = removedBy
    switch (removedBy) {
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
  async onRemove(@Ctx() ctx: WizardContext & { wizard: { state: { removedBy: string } } }, @Message() msg: { text: string }) {
    const { from } = ctx
    if (!from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }

    const removedBy = ctx.wizard.state.removedBy
    if (removedBy === 'address' && !validateSolanaAddress(msg.text)) {
      return 'Please enter a valid address.'
    }

    const wallet: Partial<{ address: string; name: string }> = {}
    // @ts-ignore
    if (removedBy === 'address') wallet.address = ctx.message['text'] as string
    // @ts-ignore
    if (removedBy === 'walletName') wallet.name = ctx.message['text'] as string

    try {
      await this.monitorService.unwatchWallets(from, [wallet])
    } catch {
      await ctx.scene.leave()
      return 'Unexpected error.'
    }
    await ctx.scene.leave()
    return 'removed'
  }
}
