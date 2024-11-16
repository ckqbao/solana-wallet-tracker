import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { CreateTrackDto } from '../dto/create-track.dto'
import { Track } from '../schema/track.schema'
import { WalletPair } from '../schema/wallet-pair.schema'

@Injectable()
export class TrackRepository {
  constructor(@InjectModel(Track.name) private trackModel: Model<Track>) {}

  async createTrack(createTrackDto: CreateTrackDto) {
    return await this.trackModel.create(createTrackDto)
  }

  async getById(trackId: string | Types.ObjectId) {
    const track = await this.trackModel.findById(trackId).exec()
    if (!track) throw new NotFoundException(`Not found track ${trackId.toString()}`)
    return track
  }

  async deleteAll() {
    return await this.trackModel.deleteMany({})
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<Track | null> {
    return await this.trackModel.findOne({ user: userId }).exec()
  }

  async getByUserId(userId: string | Types.ObjectId): Promise<Track> {
    const track = await this.trackModel.findOne({ user: userId }).exec()
    if (!track) throw new NotFoundException(`Not found track by user ${userId}`)
    return track
  }

  async deleteByUserId(userId: string | Types.ObjectId) {
    return await this.trackModel.deleteOne({ user: userId })
  }

  async trackWalletForUser(userId: string | Types.ObjectId, { wallet, name }: WalletPair) {
    await this.trackModel.updateOne(
      { user: userId, 'trackedWallets.wallet': { $ne: wallet._id } },
      {
        $addToSet: { trackedWallets: { wallet: wallet._id, name } },
      }
    )
  }

  async removeWallets(userId: string | Types.ObjectId, wallets: WalletPair[]) {
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
