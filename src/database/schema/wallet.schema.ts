import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './base.schema';

@Schema()
export class Wallet extends Base {
  @Prop({ unique: true })
  address: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
