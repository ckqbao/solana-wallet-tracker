import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Token } from '../schema/token.schema'
import { Model } from 'mongoose'

@Injectable()
export class TokenRepository {
  constructor(@InjectModel(Token.name) private tokenModel: Model<Token>) {}

  async findByAddress(address: string) {
    return this.tokenModel.findOne({ address }).exec()
  }

  async addToken(address: string, symbol: string) {
    return this.tokenModel.create({ address, symbol })
  }
}
