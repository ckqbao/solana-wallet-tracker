import { plainToInstance } from 'class-transformer'
import { Action, Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { WizardContext } from 'telegraf/typings/scenes'

import { SET_MAIN_WALLET_SCENE_ID } from '@/app.constants'

import { PaymentService } from '@/payment/payment.service'
import { UserRepository } from '@/database/repository/user.repository'

import { CreateUserDto } from '@/database/dto/create-user.dto'

@Wizard(SET_MAIN_WALLET_SCENE_ID)
export class SetMainWalletScene {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly userRepository: UserRepository
  ) {}

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    if (!ctx.from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }

    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, ctx.from))
    if (!user.wallets?.length) return 'You have no wallets'

    await ctx.reply(
      '⚙️ Set main wallet',
      Markup.inlineKeyboard(
        user.wallets.map(({ name, wallet }) => Markup.button.callback(name, wallet.address)),
        { columns: 1 }
      )
    )
    ctx.wizard.next()
  }

  @On('callback_query')
  @WizardStep(2)
  async onWalletName(@Ctx() ctx: WizardContext & { update: Update.CallbackQueryUpdate }, @Message() msg: { text: string }) {
    if (!ctx.from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }

    const cbQuery = ctx.update.callback_query
    const address = 'data' in cbQuery ? cbQuery.data : null

    if (!address) return 'Unexpected error'

    await this.paymentService.registerMainWallet(ctx.from, address)

    await ctx.scene.leave()
    return 'registered'
  }

  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave()
    return 'cancelled'
  }
}
