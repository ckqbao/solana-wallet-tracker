import _ from 'lodash'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { ShyftSdk } from '@shyft-to/js'
import { Model } from 'mongoose'
import { URL } from 'url'

import { Track } from '@/database/schema/track.schema'
import { Wallet } from '@/database/schema/wallet.schema'
import { InjectShyft } from '@/monitor/decorators/inject-shyft.decorator'

@Injectable()
export class MigrateService {
  constructor(
    @InjectShyft() private shyft: ShyftSdk,
    @InjectModel(Track.name) private trackModel: Model<Track>,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    private configService: ConfigService
  ) {
    if (this.configService.get('ENABLE_MIGRATION') === 'true') {
      this.migrate()
    }
  }

  async migrate() {
    // find tracks that have deprecated prop `wallets`
    const tracks = await this.trackModel.find({ wallets: { $exists: true } }).exec()
    if (!tracks.length) return

    // add wallets that have not existed yet
    const trackedWallets = tracks.map((track) => _.get(track.toObject(), 'wallets')).flat()
    const existingWallets = await this.walletModel.find({ address: { $in: trackedWallets.map((wallet) => _.get(wallet, 'address')) } }).exec()
    await this.walletModel.create(
      _.differenceBy(
        trackedWallets.map((wallet) => _.pick(wallet, 'address')),
        existingWallets,
        'address'
      )
    )

    const callbacks = await this.shyft.callback.list()
    for (const track of tracks) {
      const migratedWallets = _.get(track.toObject(), 'wallets', [])
      if (!migratedWallets.length) {
        await this.trackModel.deleteOne({ _id: track._id })
        continue
      }

      const [callbackId, ...deletedCallbackIds] = _.map(migratedWallets, 'callbackId')
      const callback = callbacks.find((callback) => callback.id === callbackId)
      if (!callback) continue

      const callbackUrl = new URL(callback.callback_url)
      const wallets = await this.walletModel.find({ address: { $in: migratedWallets.map((migratedWallet) => _.get(migratedWallet, 'address')) } })
      await this.trackModel.updateOne(
        { _id: track._id },
        {
          $unset: { wallets: '' },
          $set: {
            telegramChatId: parseInt(callbackUrl.searchParams.get('chatId')),
            transactionCallbackId: callbackId,
            trackedWallets: wallets.map((wallet) => ({
              wallet: wallet._id,
              name: migratedWallets.find((migratedWallet) => _.get(migratedWallet, 'address') === wallet.address)?.name,
            })),
          },
        }
      )
      await this.shyft.callback.update({
        id: callbackId,
        addresses: wallets.map((wallet) => wallet.address),
        callbackUrl: `${this.configService.get('DOMAIN_URL')}/api/monitors/transactions?userId=${track.user._id.toString()}`,
      })
      for (const deletedCallbackId of deletedCallbackIds) {
        await this.shyft.callback.remove({ id: deletedCallbackId })
      }
    }
  }
}
