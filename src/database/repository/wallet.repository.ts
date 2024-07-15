import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { Wallet } from '../schema/wallet.schema'
import { CreateWalletDto } from '../dto/create-wallet.dto'

@Injectable()
export class WalletRepository {
  constructor(@InjectModel(Wallet.name) private walletModel: Model<Wallet>) {}

  async getById(walletId: string | Types.ObjectId): Promise<Wallet> {
    const wallet = await this.walletModel.findById(walletId).exec()
    if (!wallet) throw new NotFoundException(`Not found wallet by address ${walletId}`)
    return wallet
  }

  async getByAddress(address: string): Promise<Wallet> {
    const wallet = await this.walletModel.findOne({ address }).exec()
    if (!wallet) throw new NotFoundException(`Not found wallet by address ${address}`)
    return wallet
  }

  getByAddresses(addresses: string[]): Promise<Wallet[]> {
    return this.walletModel.find({ address: { $in: addresses } }).exec()
  }

  async getOrCreateWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {
    let wallet = await this.walletModel.findOne({ address: createWalletDto.address }).exec()
    if (!wallet) {
      wallet = await this.walletModel.create(createWalletDto)
    }
    return wallet
  }

  async getMainWallet() {
    const wallet = await this.walletModel.findOne({ isMain: true }).exec()
    if (!wallet) throw new NotFoundException(`No main wallet found`)
    return wallet
  }

  async setMainWallet(walletId: string | Types.ObjectId) {
    await this.walletModel.updateMany({ _id: { $ne: walletId } }, { $unset: { isMain: '' } })
    await this.walletModel.updateOne({ _id: walletId }, { $set: { isMain: true } }, { runValidators: true })
    return await this.getById(walletId)
  }
}
