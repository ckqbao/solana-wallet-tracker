import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Network, ShyftSdk } from '@shyft-to/js'
import { plainToInstance } from 'class-transformer'
import { User as TelegramUser } from 'telegraf/typings/core/types/typegram'

import { eventWatchList } from './utils/events'

import { CreateUserDto } from '@/database/dto/create-user.dto'
import { TrackRepository } from '@/database/repository/track.repository'
import { UserRepository } from '@/database/repository/user.repository'
import { WalletRepository } from '@/database/repository/wallet.repository'

import { prepareCreateUserDtoFromTelegramUser } from '@/utils/telegram-user'

import { WatchWalletDto } from './dto/watch-wallet.dto'
import { Track } from '@/database/schema/track.schema'
import { Env } from '@/env'
import { InjectShyft } from './decorators/inject-shyft.decorator'

@Injectable()
export class MonitorService {
  constructor(
    @InjectShyft() private readonly shyft: ShyftSdk,
    private readonly configService: ConfigService<Env, true>,
    private readonly trackRepository: TrackRepository,
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  async pauseWallet(tgUser: TelegramUser, wallet: Partial<{ address: string; name: string }>) {
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, tgUser))
    const track = await this.trackRepository.getByUserId(user._id)
    const pausedWallet = track.trackedWallets.find(({ wallet: trackedWallet, name }) => wallet.address === trackedWallet.address || wallet.name === name)
    if (!pausedWallet) return
    await this.shyft.callback.removeAddresses({
      id: track.transactionCallbackId,
      addresses: [pausedWallet.wallet.address],
    })
  }

  async resumeWallet(tgUser: TelegramUser, wallet: Partial<{ address: string; name: string }>) {
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, tgUser))
    const track = await this.trackRepository.getByUserId(user._id)
    const resumedWallet = track.trackedWallets.find(({ wallet: trackedWallet, name }) => wallet.address === trackedWallet.address || wallet.name === name)
    if (!resumedWallet) return
    await this.shyft.callback.addAddresses({
      id: track.transactionCallbackId,
      addresses: [resumedWallet.wallet.address],
    })
  }

  async watchWallet({ telegramChatId, telegramUser, walletAddress, walletName }: WatchWalletDto) {
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, telegramUser))
    const track = await this.trackRepository.findByUserId(user._id.toString())
    const wallet = await this.walletRepository.getOrCreateWallet({ address: walletAddress })
    if (track) {
      await this.shyft.callback.addAddresses({
        id: track.transactionCallbackId,
        addresses: [walletAddress],
      })
      await this.trackRepository.trackWalletForUser(user._id.toString(), { wallet, name: walletName })
    } else {
      const callbackUrl = `${this.configService.get('DOMAIN_URL')}/api/monitors/transactions?userId=${user._id.toString()}`
      const callback = await this.shyft.callback.register({
        network: this.configService.get('NETWORK'),
        addresses: [walletAddress],
        callbackUrl,
        events: eventWatchList,
      })
      await this.trackRepository.createTrack({
        telegramChatId,
        transactionCallbackId: callback.id,
        user: user._id.toString(),
        trackedWallets: [{ wallet: wallet._id.toString(), name: walletName }],
      })
    }
  }

  async unwatchWallets(telegramUser: TelegramUser, wallets: Partial<{ address: string; name: string }>[]) {
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, telegramUser))
    const track = await this.trackRepository.getByUserId(user._id)
    const removedWallets = track.trackedWallets.filter(({ wallet: trackedWallet, name }) =>
      wallets.find((wallet) => wallet.address === trackedWallet.address || wallet.name === name)
    )
    if (!removedWallets.length) return
    await this.shyft.callback.removeAddresses({
      id: track.transactionCallbackId,
      addresses: removedWallets.map(({ wallet }) => wallet.address),
    })
    await this.trackRepository.removeWallets(user._id, removedWallets)
  }

  async getTelegramUserTrackedWallets(telegramUser: TelegramUser) {
    const user = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, telegramUser))
    const track = await this.trackRepository.findByUserId(user._id)
    return track?.trackedWallets ?? []
  }

  async pauseTrack(track: Track) {
    await this.shyft.callback.pause({ id: track.transactionCallbackId })
  }

  async resumeTrack(track: Track) {
    await this.shyft.callback.resume({ id: track.transactionCallbackId })
  }
}
