import { Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

import { ADD_WALLET_SCENE_ID } from '@/app.constants'

import { MonitorService } from '@/monitor/monitor.service'

import { validateSolanaAddress } from '@/utils/validate-wallet'

@Wizard(ADD_WALLET_SCENE_ID)
export class AddWalletScene {
  constructor(private monitorService: MonitorService) {}

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    ctx.wizard.next()
    return 'Please enter the address you want to track:'
  }

  @On('text')
  @WizardStep(2)
  async onAddress(@Ctx() ctx: WizardContext, @Message() msg: { text: string }) {
    const address = msg.text
    if (!validateSolanaAddress(address)) {
      return 'Please provide a valid address.'
    }

    const trackedWallets = await this.monitorService.getTelegramUserTrackedWallets(ctx.from)
    if (trackedWallets.find(({ wallet }) => wallet.address === address)) {
      return 'Address is already added, please choose another.'
    }

    ctx.wizard.state['address'] = address
    ctx.wizard.next()
    return 'Please name the wallet:'
  }

  @On('text')
  @WizardStep(3)
  async onWalletName(@Ctx() ctx: WizardContext & { wizard: { state: { address: string } } }, @Message() msg: { text: string }) {
    if (msg.text === 'abort') {
      await ctx.scene.leave()
      return 'cancelled'
    }

    const address = ctx.wizard.state.address
    const walletName = msg.text
    await this.monitorService.watchWallet({
      telegramChatId: ctx.chat.id,
      telegramUser: ctx.from,
      walletAddress: address,
      walletName,
    })

    await ctx.scene.leave()
    return 'tracked'
  }

  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave()
    return 'cancelled'
  }
}
