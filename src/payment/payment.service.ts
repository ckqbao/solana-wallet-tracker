import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Network, ShyftSdk, TxnAction } from '@shyft-to/js'
import { plainToInstance } from 'class-transformer'
import dayjs from 'dayjs'
import { User as TelegramUser } from 'telegraf/typings/core/types/typegram'

import { UserRepository } from '@/database/repository/user.repository'
import { InjectShyft } from '@/monitor/decorators/inject-shyft.decorator'
import { CreateUserDto } from '@/database/dto/create-user.dto'
import { SubscriptionRepository } from '@/database/repository/subscription.repository'
import { WalletRepository } from '@/database/repository/wallet.repository'
import { Types } from 'mongoose'

@Injectable()
export class PaymentService {
  constructor(
    @InjectShyft() private readonly shyft: ShyftSdk,
    private readonly configService: ConfigService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  async registerMainWallet(telegramUser: TelegramUser, address: string) {
    const wallet = await this.walletRepository.getByAddress(address)
    await this.walletRepository.setMainWallet(wallet._id)
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, telegramUser))
    const callbackUrl = `${this.configService.get('DOMAIN_URL')}/api/monitors/sol-transfer?userId=${user._id.toString()}`
    if (user.solTransferCallbackId) {
      await this.shyft.callback.update({
        id: user.solTransferCallbackId,
        addresses: [address],
        callbackUrl,
      })
    } else {
      const callback = await this.shyft.callback.register({
        network: Network.Mainnet,
        addresses: [address],
        callbackUrl,
        events: [TxnAction.SOL_TRANSFER],
      })
      this.userRepository.registerSolTransferCallback(user._id, callback.id)
    }
  }

  async confirmPayment(userId: string | Types.ObjectId, transferedSol: number, timestamps: Date) {
    const user = await this.userRepository.getById(userId)
    let subscription = user.subscription
    if (subscription && dayjs(timestamps).isBefore(subscription.expiredAt)) {
      await this.subscriptionRepository.updateSubscription(subscription._id, { transferedSol: subscription.transferedSol + transferedSol })
    } else {
      subscription = await this.subscriptionRepository.createSubscription({ transferedSol, user: userId })
      await this.userRepository.registerSubscription(userId, subscription)
    }
  }
}
