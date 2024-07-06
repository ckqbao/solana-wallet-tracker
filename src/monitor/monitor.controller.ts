import { BadRequestException, Body, Controller, Logger, NotFoundException, Post, Query } from '@nestjs/common'
import { BotService } from '@/bot/bot.service'
import { TrackTransactionDto } from './dto/track-transaction.dto'
import { eventWatchList } from './utils/events'
import { TrackService } from '@/database/services/track.service'

@Controller('monitors')
export class MonitorController {
  private logger = new Logger('MonitorController')

  constructor(
    private readonly botService: BotService,
    private readonly trackService: TrackService
  ) {}

  @Post('transactions')
  async trackTransactions(@Body() body: TrackTransactionDto, @Query('userId') userId: string) {
    const address = body.triggered_for
    this.logger.log('🚀 ~ MonitorController ~ address:', address)
    if (!address) throw new BadRequestException('Missing triggered for')

    if (!body.type || !body.actions || !eventWatchList.includes(body.type)) {
      throw new BadRequestException('Invalid data type')
    }

    const action = body.actions.find((action) => action.type === body.type)

    if (body.status !== 'Success') return

    const tokensSwapped = action?.info?.tokens_swapped

    if (!tokensSwapped) throw new BadRequestException('Invalid callback data')

    const track = await this.trackService.getByUserId(userId)
    this.logger.log(track)
    const wallet = track.trackedWallets.find(({ wallet }) => wallet.address === address)
    this.logger.log(wallet)
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
