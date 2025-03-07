import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Base } from './base.schema'

@Schema()
export class Token extends Base {
  @Prop({ unique: true })
  address: string

  @Prop()
  symbol: string
}

export const TokenSchema = SchemaFactory.createForClass(Token)
