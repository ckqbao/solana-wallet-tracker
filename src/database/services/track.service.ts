import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { CreateTrackDto } from '../dto/create-track.dto'
import { Track, TrackedWallet } from '../schema/track.schema'
import { WalletService } from './wallet.service'

@Injectable()
export class TrackService {
  constructor(
    @InjectModel(Track.name) private trackModel: Model<Track>,
    private walletService: WalletService
  ) {}

  async createTrack(createTrackDto: CreateTrackDto) {
    return await this.trackModel.create(createTrackDto)
  }

  async deleteAll() {
    return await this.trackModel.deleteMany({})
  }

  async getByUserId(userId: string | Types.ObjectId): Promise<Track> {
    return await this.trackModel.findOne({ user: userId }).exec()
  }

  async deleteByUserId(userId: string | Types.ObjectId) {
    return await this.trackModel.deleteOne({ user: userId })
  }

  async trackWalletForUser(userId: string | Types.ObjectId, { wallet, name }: TrackedWallet) {
    await this.trackModel.updateOne(
      { user: userId, 'trackedWallets.wallet': { $ne: wallet._id } },
      {
        $addToSet: { trackedWallets: { wallet: wallet._id, name } },
      }
    )
  }

  async removeWallets(userId: string | Types.ObjectId, wallets: TrackedWallet[]) {
    await this.trackModel.updateOne(
      { user: userId },
      {
        $pull: {
          trackedWallets: {
            wallet: { $in: wallets.map(({ wallet }) => wallet._id) },
          },
        },
      }
    )
  }
}
