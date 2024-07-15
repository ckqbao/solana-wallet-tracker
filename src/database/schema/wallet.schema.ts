import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Base } from './base.schema'

@Schema()
export class Wallet extends Base {
  @Prop({ unique: true })
  address: string

  @Prop({ default: false })
  isMain?: boolean
}

export const WalletSchema = SchemaFactory.createForClass(Wallet)

WalletSchema.index({ isMain: 1 }, { unique: true, partialFilterExpression: { isMain: true } })
