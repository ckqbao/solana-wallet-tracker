import { Injectable } from '@nestjs/common'
import { InjectBot } from 'nestjs-telegraf'
import { Telegraf } from 'telegraf'

import { Context } from './interfaces/context.interface'

import { TrackTransactionDto } from '@/monitor/dto/track-transaction.dto'
import { ignoredInNotificationTokenAddresses } from '@/monitor/utils/tokens'
import { SUBSCRIPTION_SOL_AMOUNT } from '@/app.constants'

@Injectable()
export class BotService {
  constructor(@InjectBot() private bot: Telegraf<Context>) {}

  async notifyExpiredFreeTrial(chatId: number) {
    this.bot.telegram.sendMessage(chatId, 'Your free trial has expired. Please subscribe to continue to use the bot')
  }

  async notifyExpiredSubscription(chatId: number) {
    this.bot.telegram.sendMessage(chatId, 'Your current subscription has expired. Please renew it to use the bot')
  }

  async notifyInsufficientTransferedSol(chatId: number, transferedSol: number) {
    if (SUBSCRIPTION_SOL_AMOUNT <= transferedSol) return
    this.bot.telegram.sendMessage(chatId, `You need to transfer ${SUBSCRIPTION_SOL_AMOUNT - transferedSol} to finish the subscription`)
  }

  async notifyTransaction(params: {
    address: string
    chatId: number
    txnSignature: string
    swappedTokens: TrackTransactionDto['actions'][number]['info']['tokens_swapped']
    walletName: string
  }) {
    const { address, chatId, txnSignature, swappedTokens, walletName } = params

    let message =
      `[${walletName}](https://solscan.io/account/${address})\n` +
      `${swappedTokens.in.amount} ${swappedTokens.in.symbol} <=> ${swappedTokens.out.amount} ${swappedTokens.out.symbol}\n`

    if (!ignoredInNotificationTokenAddresses.includes(swappedTokens.in.token_address)) {
      message +=
        `${swappedTokens.in.symbol}: ` +
        '`' +
        swappedTokens.in.token_address +
        '`' +
        ` - Buy: [BananaGun](https://t.me/BananaGunSolana_bot?start=snp_jetlychau_${swappedTokens.in.token_address})` +
        ` - Chart: [Dexscreener](https://dexscreener.com/solana/${swappedTokens.in.token_address}) | [Photon](https://photon-sol.tinyastro.io/en/lp/${swappedTokens.in.token_address})\n`
    }

    if (!ignoredInNotificationTokenAddresses.includes(swappedTokens.out.token_address)) {
      message +=
        `${swappedTokens.out.symbol}: ` +
        '`' +
        swappedTokens.out.token_address +
        '`' +
        ` - Buy: [BananaGun](https://t.me/BananaGunSolana_bot?start=snp_jetlychau_${swappedTokens.out.token_address})` +
        ` - Chart: [Dexscreener](https://dexscreener.com/solana/${swappedTokens.out.token_address}) | [Photon](https://photon-sol.tinyastro.io/en/lp/${swappedTokens.out.token_address})\n`
    }
    message += `Transaction link: [txn](https://solscan.io/tx/${txnSignature})\n`

    this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: true,
      },
    })
  }
}
