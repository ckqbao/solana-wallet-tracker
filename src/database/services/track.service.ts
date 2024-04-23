import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateTrackDto } from '../dto/create-track.dto';
import { Track, Wallet } from '../schema/track.schema';

@Injectable()
export class TrackService {
  constructor(@InjectModel(Track.name) private trackModel: Model<Track>) {}

  async create(input: CreateTrackDto) {
    return await this.trackModel.create(input);
  }

  async deleteAll() {
    return await this.trackModel.deleteMany({});
  }

  async getByUserId(userId: string) {
    return await this.trackModel.findOne({ user: userId });
  }

  async deleteByUserId(userId: string) {
    return await this.trackModel.deleteOne({ user: userId });
  }

  async addWallet(userId: string, wallet: Wallet) {
    await this.trackModel.updateOne(
      { user: userId, 'wallets.address': { $ne: wallet.address } },
      {
        $addToSet: { wallets: wallet },
      },
    );
  }

  async removeWallets(userId: string, addresses: string[]) {
    return await this.trackModel.findOneAndUpdate(
      { user: userId },
      {
        $pull: {
          addresses: {
            $elemMatch: {
              address: { $in: addresses },
            },
          },
        },
      },
    );
  }
}
