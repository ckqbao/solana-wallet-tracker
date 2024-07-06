import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Network, ShyftSdk } from '@shyft-to/js'
import { plainToInstance } from 'class-transformer'
import { User as TelegramUser } from 'telegraf/typings/core/types/typegram'

import { eventWatchList } from './utils/events'

import { TrackService } from '@/database/services/track.service'
import { UserService } from '@/database/services/user.service'
import { CreateUserDto } from '@/database/dto/create-user.dto'
import { WalletService } from '@/database/services/wallet.service'

import { prepareCreateUserDtoFromTelegramUser } from '@/utils/telegram-user'

import { WatchWalletDto } from './dto/watch-wallet.dto'
import { InjectShyft } from './decorators/inject-shyft.decorator'

@Injectable()
export class MonitorService {
  constructor(
    @InjectShyft() private readonly shyft: ShyftSdk,
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
    private readonly userService: UserService,
    private readonly walletService: WalletService
  ) {}

  async watchWallet({ telegramChatId, telegramUser, walletAddress, walletName }: WatchWalletDto) {
    const user = await this.userService.getOrCreate(prepareCreateUserDtoFromTelegramUser(telegramUser))
    const track = await this.trackService.getByUserId(user._id.toString())
    const wallet = await this.walletService.getOrCreateWallet({ address: walletAddress })
    if (track) {
      await this.shyft.callback.addAddresses({
        id: track.transactionCallbackId,
        addresses: [walletAddress],
      })
      await this.trackService.trackWalletForUser(user._id.toString(), { wallet, name: walletName })
    } else {
      const callback = await this.shyft.callback.register({
        network: Network.Mainnet,
        addresses: [walletAddress],
        callbackUrl: `${this.configService.get('DOMAIN_URL')}/api/monitors/transactions?userId=${user._id.toString()}`,
        events: eventWatchList,
      })
      await this.trackService.createTrack({
        telegramChatId,
        transactionCallbackId: callback.id,
        user: user._id.toString(),
        trackedWallets: [{ wallet: wallet._id.toString(), name: walletName }],
      })
    }
  }

  async unwatchWallets(telegramUser: TelegramUser, wallets: Partial<{ address: string; name: string }>[]) {
    const user = await this.userService.getOrCreate(plainToInstance(CreateUserDto, telegramUser))
    const track = await this.trackService.getByUserId(user._id)
    if (!track) return

    const removedWallets = track.trackedWallets.filter(({ wallet: trackedWallet, name }) =>
      wallets.find((wallet) => wallet.address === trackedWallet.address || wallet.name === name)
    )
    if (!removedWallets.length) return

    await this.shyft.callback.removeAddresses({
      id: track.transactionCallbackId,
      addresses: removedWallets.map(({ wallet }) => wallet.address),
    })
    await this.trackService.removeWallets(user._id, removedWallets)
  }

  async getTelegramUserTrackedWallets(telegramUser: TelegramUser) {
    const user = await this.userService.getOrCreate(plainToInstance(CreateUserDto, telegramUser))
    const track = await this.trackService.getByUserId(user._id)
    return track?.trackedWallets ?? []
  }
}
