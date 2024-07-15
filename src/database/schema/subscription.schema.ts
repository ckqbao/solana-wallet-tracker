import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'

import { Base } from './base.schema'

@Schema({ timestamps: true })
export class Subscription extends Base {
  createdAt: Date
  updatedAt: Date

  @Prop()
  expiredAt: Date

  @Prop()
  transferedSol: number

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: mongoose.Types.ObjectId
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription)
