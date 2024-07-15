import bs58 from 'bs58'
import { Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

import { WALLET_SETTINGS } from '@/app.constants'
import { Markup } from 'telegraf'
import { Update } from 'telegraf/typings/core/types/typegram'
import { Keypair } from '@solana/web3.js'
import { UserRepository } from '@/database/repository/user.repository'
import { plainToInstance } from 'class-transformer'
import { CreateUserDto } from '@/database/dto/create-user.dto'
import { WalletRepository } from '@/database/repository/wallet.repository'

@Wizard(WALLET_SETTINGS)
export class WalletSettingsScene {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    await ctx.reply(
      '⚙️ Wallet Setup',
      Markup.inlineKeyboard([Markup.button.callback('Create wallet', 'create-wallet'), Markup.button.callback('Import wallet', 'import-wallet')])
    )
    ctx.wizard.next()
  }

  @On('callback_query')
  @WizardStep(2)
  async onSetupWallet(@Ctx() ctx: WizardContext & { update: Update.CallbackQueryUpdate }) {
    const cbQuery = ctx.update.callback_query
    const setup = 'data' in cbQuery ? cbQuery.data : null
    ctx.scene.state = { setup }
    if (!setup) ctx.scene.reset()
    await ctx.reply('⚙️ Name your wallet', { reply_markup: { force_reply: true } })
    ctx.wizard.next()
  }

  @On('text')
  @WizardStep(3)
  async onNameWallet(@Ctx() ctx: WizardContext, @Message() msg: { text: string }) {
    if (!ctx.from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, ctx.from))
    const { setup } = ctx.scene.state as { setup: string }
    switch (setup) {
      case 'create-wallet':
        const keypair = Keypair.generate()
        const wallet = await this.walletRepository.getOrCreateWallet({ address: keypair.publicKey.toBase58() })
        await this.userRepository.registerWallet(user._id, { name: msg.text, wallet })
        await ctx.reply(
          '✅ Successfully Created Wallet\n\n' +
            '⚠️ SAVE YOUR PRIVATE KEY. IF YOU DELETE THIS MESSAGE, WE WILL NOT SHOW YOUR YOUR PRIVATE KEY AGAIN.\n\n' +
            '💡 Private key:\n' +
            '`' +
            bs58.encode(keypair.secretKey) +
            '`',
          {
            parse_mode: 'Markdown',
          }
        )
        await ctx.scene.leave()
        return
      case 'import-wallet':
        ctx.scene.state = { name: msg.text }
        await ctx.reply('💡 Enter your private key', { reply_markup: { force_reply: true } })
        ctx.wizard.next()
        return
      default:
        ctx.scene.reset()
        return
    }
  }

  @On('text')
  @WizardStep(4)
  async onEnterPrivateKey(@Ctx() ctx: WizardContext, @Message() msg: { text: string }) {
    if (!ctx.from) {
      await ctx.scene.leave()
      return 'Unexpected error'
    }
    const { name } = ctx.scene.state as { name: string }
    const privateKey = msg.text
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))
    const wallet = await this.walletRepository.getOrCreateWallet({ address: keypair.publicKey.toBase58() })
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, ctx.from))
    await this.userRepository.registerWallet(user._id, { name, wallet })
    await ctx.deleteMessage(ctx.message?.message_id)
    await ctx.scene.leave()
    return 'imported'
  }

  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave()
    return 'cancelled'
  }
}
