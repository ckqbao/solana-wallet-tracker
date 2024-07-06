import { User } from 'telegraf/typings/core/types/typegram'

export class WatchWalletDto {
  telegramChatId: number
  telegramUser: User
  walletAddress: string
  walletName: string
}
