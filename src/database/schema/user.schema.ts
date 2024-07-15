import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'

import { RoleEnum } from '@/authz/enums/role.enum'
import { Base } from './base.schema'
import { Wallet } from './wallet.schema'
import { Subscription } from './subscription.schema'
import { WalletPair, WalletPairSchema } from './wallet-pair.schema'
import { ManipulateType } from 'dayjs'

@Schema({ _id: false })
export class FreeTrial {
  @Prop()
  duration: number

  @Prop({ type: String })
  durationUnit: ManipulateType

  @Prop()
  startedAt: Date
}

const FreeTrialSchema = SchemaFactory.createForClass(FreeTrial)

@Schema()
export class User extends Base {
  @Prop()
  telegramId: number

  @Prop()
  firstName: string

  @Prop()
  lastName: string

  @Prop({ type: FreeTrialSchema })
  freeTrial: FreeTrial

  @Prop()
  username: string

  @Prop({ enum: RoleEnum, default: RoleEnum.REGULAR })
  role: RoleEnum

  @Prop()
  solTransferCallbackId?: string

  @Prop({ autopopulate: true, type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: false })
  subscription?: Subscription

  @Prop({ type: [WalletPairSchema], required: false })
  wallets?: WalletPair[]
}

export const UserSchema = SchemaFactory.createForClass(User)
