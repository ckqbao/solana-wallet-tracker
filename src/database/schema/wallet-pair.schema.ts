import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'

import { Wallet } from './wallet.schema'

@Schema({ _id: false })
export class WalletPair {
  @Prop({
    autopopulate: { select: 'address' },
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
  })
  wallet: Pick<Wallet, '_id' | 'address'>

  @Prop()
  name: string
}

export const WalletPairSchema = SchemaFactory.createForClass(WalletPair)
