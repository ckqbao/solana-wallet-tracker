export class CreateTrackDto {
  telegramChatId: number
  transactionCallbackId: string
  user: string
  trackedWallets?: Array<{
    name: string
    wallet: string
  }>
}
