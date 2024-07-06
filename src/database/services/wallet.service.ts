import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { Wallet } from '../schema/wallet.schema'
import { CreateWalletDto } from '../dto/create-wallet.dto'

@Injectable()
export class WalletService {
  constructor(@InjectModel(Wallet.name) private walletModel: Model<Wallet>) {}

  getByAddress(address: string): Promise<Wallet> {
    return this.walletModel.findOne({ address }).exec()
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
}
