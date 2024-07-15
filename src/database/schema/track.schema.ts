import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'

import { Base } from './base.schema'
import { User } from './user.schema'
import { WalletPair, WalletPairSchema } from './wallet-pair.schema'

@Schema()
export class Track extends Base {
  @Prop()
  telegramChatId: number

  @Prop({ type: [WalletPairSchema] })
  trackedWallets: WalletPair[]

  @Prop()
  transactionCallbackId: string

  @Prop({
    autopopulate: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    unique: true,
  })
  user: User
}

export const TrackSchema = SchemaFactory.createForClass(Track)
