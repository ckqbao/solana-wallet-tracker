import { BadRequestException, Body, Controller, Logger, NotFoundException, Post, Query } from '@nestjs/common'
import { TxnAction } from '@shyft-to/js'
import dayjs from 'dayjs'

import { BotService } from '@/bot/bot.service'
import { MonitorService } from './monitor.service'
import { PaymentService } from '@/payment/payment.service'
import { TrackRepository } from '@/database/repository/track.repository'
import { UserRepository } from '@/database/repository/user.repository'
import { WalletRepository } from '@/database/repository/wallet.repository'

import { TrackSolTransferDto } from './dto/track-sol-transfer.dto'
import { TrackTransactionDto } from './dto/track-transaction.dto'
import { eventWatchList } from './utils/events'
import { SUBSCRIPTION_SOL_AMOUNT } from '@/app.constants'

@Controller('monitors')
export class MonitorController {
  private logger = new Logger('MonitorController')

  constructor(
    private readonly botService: BotService,
    private readonly monitorService: MonitorService,
    private readonly paymentService: PaymentService,
    private readonly trackRepository: TrackRepository,
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  @Post('sol-transfer')
  async trackSolTransfer(@Body() body: TrackSolTransferDto, @Query('userId') userId: string) {
    if (!body.actions || body.type !== TxnAction.SOL_TRANSFER) {
      throw new BadRequestException('Invalid data type')
    }

    const action = body.actions.find((action) => action.type === body.type)

    if (!action) throw new BadRequestException('Invalid callback data')
    if (body.status !== 'Success') return

    const user = await this.userRepository.getById(userId)
    if (!user.wallets?.find(({ wallet }) => wallet.address === action.info.receiver)) throw new BadRequestException('Invalid receiver address')

    const wallet = await this.walletRepository.getOrCreateWallet({ address: action.info.sender })
    const sender = await this.userRepository.getByWalletAddress(wallet)
    await this.paymentService.confirmPayment(sender._id, action.info.amount, new Date())
    try {
      const track = await this.trackRepository.getByUserId(userId)
      await this.monitorService.resumeTrack(track)
    } catch {}

    return 'OK'
  }

  @Post('transactions')
  async trackTransactions(@Body() body: TrackTransactionDto, @Query('userId') userId: string) {
    const track = await this.trackRepository.getByUserId(userId)
    const { freeTrial, subscription } = await this.userRepository.getById(userId)

    if (!subscription && dayjs().isAfter(dayjs(freeTrial.startedAt).add(freeTrial.duration, freeTrial.durationUnit))) {
      await this.monitorService.pauseTrack(track)
      this.botService.notifyExpiredFreeTrial(track.telegramChatId)
      return 'OK'
    }

    if (subscription && subscription.transferedSol < SUBSCRIPTION_SOL_AMOUNT) {
      await this.monitorService.pauseTrack(track)
      this.botService.notifyInsufficientTransferedSol(track.telegramChatId, subscription.transferedSol)
      return 'OK'
    }

    if (subscription && dayjs().isAfter(subscription.expiredAt)) {
      await this.monitorService.pauseTrack(track)
      this.botService.notifyExpiredSubscription(track.telegramChatId)
      return 'OK'
    }

    const address = body.triggered_for
    if (!address) throw new BadRequestException('Missing triggered for')

    if (!body.type || !body.actions || !eventWatchList.includes(body.type)) {
      throw new BadRequestException('Invalid data type')
    }

    const action = body.actions.find((action) => action.type === body.type)

    if (body.status !== 'Success') return

    const tokensSwapped = action?.info?.tokens_swapped

    if (!tokensSwapped) throw new BadRequestException('Invalid callback data')

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
