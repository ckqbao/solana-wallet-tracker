import _ from 'lodash'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectBot } from 'nestjs-telegraf'
import { Telegraf } from 'telegraf'

import { Context } from './interfaces/context.interface'

import { TrackTransactionDto } from '@/monitor/dto/track-transaction.dto'
import { ignoredInNotificationTokenAddresses } from '@/monitor/utils/tokens'
import { SUBSCRIPTION_SOL_AMOUNT } from '@/app.constants'
import { TokenRepository } from '@/database/repository/token.repository'

@Injectable()
export class BotService {
  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly tokenRepository: TokenRepository
  ) {}

  private async getTokenSymbol(address: string, initialSymbol: string) {
    if (initialSymbol !== 'Token') return initialSymbol

    const token = await this.tokenRepository.findByAddress(address)
    if (token) return token.symbol

    const baseUrl = this.configService.get('HELIUS_API_URL') || 'https://mainnet.helius-rpc.com'
    const apiKey = this.configService.get('HELIUS_API_KEY')
    const response = await fetch(`${baseUrl}/?api-key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'bot',
        method: 'getAsset',
        params: {
          id: address,
        },
      }),
    })
    if (!response.ok) return 'N/A'
    const data = await response.json()
    const symbol = _.get<string>(data, 'result.content.metadata.symbol', 'N/A')
    await this.tokenRepository.addToken(address, symbol)
    return symbol
  }

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
    const tokenInSymbol = await this.getTokenSymbol(swappedTokens.in.token_address, swappedTokens.in.symbol)
    const tokenOutSymbol = await this.getTokenSymbol(swappedTokens.out.token_address, swappedTokens.out.symbol)

    let message =
      `[${walletName}](https://solscan.io/account/${address})\n` +
      `${swappedTokens.in.amount} ${tokenInSymbol} <=> ${swappedTokens.out.amount} ${tokenOutSymbol}\n`

    if (!ignoredInNotificationTokenAddresses.includes(swappedTokens.in.token_address)) {
      message +=
        `${tokenInSymbol}: ` +
        '`' +
        swappedTokens.in.token_address +
        '`' +
        ` - Buy: [BananaGun](https://t.me/BananaGunSolana_bot?start=snp_jetlychau_${swappedTokens.in.token_address})` +
        ` - Chart: [Dexscreener](https://dexscreener.com/solana/${swappedTokens.in.token_address}) | [Photon](https://photon-sol.tinyastro.io/en/lp/${swappedTokens.in.token_address})\n`
    }

    if (!ignoredInNotificationTokenAddresses.includes(swappedTokens.out.token_address)) {
      message +=
        `${tokenOutSymbol}: ` +
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
