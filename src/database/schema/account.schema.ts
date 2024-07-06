import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema()
export class Account {
  @Prop()
  email: string

  @Prop()
  password: string
}

export const AccountSchema = SchemaFactory.createForClass(Account)
