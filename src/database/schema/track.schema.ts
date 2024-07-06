import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'

import { User } from './user.schema'
import { Wallet } from './wallet.schema'

@Schema({ _id: false })
export class TrackedWallet {
  @Prop({
    autopopulate: { select: 'address' },
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
  })
  wallet: Pick<Wallet, '_id' | 'address'>

  @Prop()
  name: string
}

const TrackedWalletSchema = SchemaFactory.createForClass(TrackedWallet)

@Schema()
export class Track {
  @Prop()
  telegramChatId: number

  @Prop({ type: [TrackedWalletSchema] })
  trackedWallets: TrackedWallet[]

  @Prop()
  transactionCallbackId: string

  @Prop({
    autopopulate: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    unique: true,
  })
  user: User

  /**
   *@deprecated
   */
  @Prop({ type: mongoose.Schema.Types.Mixed })
  wallets: Array<{ address: string; name: string }>
}

export const TrackSchema = SchemaFactory.createForClass(Track)
