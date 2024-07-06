import { BadRequestException, Body, Controller, NotFoundException, Post, Query } from '@nestjs/common'
import { BotService } from '@/bot/bot.service'
import { TrackTransactionDto } from './dto/track-transaction.dto'
import { eventWatchList } from './utils/events'
import { TrackService } from '@/database/services/track.service'

@Controller('monitors')
export class MonitorController {
  constructor(
    private readonly botService: BotService,
    private readonly trackService: TrackService
  ) {}

  @Post('transactions')
  async trackTransactions(@Body() body: TrackTransactionDto, @Query('userId') userId: string) {
    const address = body.triggered_for
    if (!address) throw new BadRequestException('Missing triggered for')

    if (!body.type || !body.actions || !eventWatchList.includes(body.type)) {
      throw new BadRequestException('Invalid data type')
    }

    const action = body.actions.find((action) => action.type === body.type)

    if (body.status !== 'Success') return

    const tokensSwapped = action?.info?.tokens_swapped

    if (!tokensSwapped) throw new BadRequestException('Invalid callback data')

    const track = await this.trackService.getByUserId(userId)
    const wallet = track.trackedWallets.find(({ wallet }) => wallet.address === address)

    if (!wallet) throw new NotFoundException(`Not found wallet with address ${address}`)

    this.botService.notifyTransaction({
      address,
      chatId: track.telegramChatId,
      txnSignature: body.signatures[0],
      swappedTokens: tokensSwapped,
      walletName: wallet.name,
    })

    return 'OK'
  }
}
