import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types, UpdateQuery } from 'mongoose'

import { CreateUserDto } from '../dto/create-user.dto'
import { User } from '../schema/user.schema'
import { Wallet } from '../schema/wallet.schema'
import { Subscription } from '../schema/subscription.schema'
import { WalletPair } from '../schema/wallet-pair.schema'

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getById(userId: string | Types.ObjectId): Promise<User> {
    const user = await this.userModel.findById(userId).exec()
    if (!user) throw new NotFoundException(`Not found user ${userId}`)
    return user
  }

  async getByWalletAddress(wallet: Wallet) {
    const user = await this.userModel.findOne({ 'wallets.wallet': wallet._id }).exec()
    if (!user) throw new NotFoundException(`Not found user that contains the wallet address ${wallet.address}`)
    return user
  }

  async getOrCreate(createUserDto: CreateUserDto) {
    let user = await this.userModel.findOne({
      telegramId: createUserDto.telegramId,
    })
    if (!user) {
      user = await this.userModel.create({
        ...createUserDto,
        freeTrial: {
          duration: 7,
          durationUnit: 'days',
          startedAt: new Date(),
        },
      })
    }
    return user
  }

  async registerSolTransferCallback(userId: string | Types.ObjectId, callbackId: string) {
    await this.userModel.updateOne({ _id: userId }, { solTransferCallbackId: callbackId })
    return await this.getById(userId)
  }

  async registerSubscription(userId: string | Types.ObjectId, subscription: Subscription) {
    await this.userModel.updateOne({ _id: userId }, { $set: { subscription: subscription._id } })
    return await this.getById(userId)
  }

  async registerWallet(userId: string | Types.ObjectId, { name, wallet }: WalletPair) {
    await this.userModel.updateOne(
      { _id: userId, 'wallets.wallet': { $ne: wallet._id } },
      {
        $addToSet: { wallets: { wallet: wallet._id, name } },
      }
    )
    return await this.getById(userId)
  }
}
