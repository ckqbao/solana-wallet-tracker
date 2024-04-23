import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

import { Base } from './base.schema';
import { User } from './user.schema';

@Schema({ _id: false })
export class Wallet {
  @Prop()
  address: string;

  @Prop()
  name: string;
}

const WalletSchema = SchemaFactory.createForClass(Wallet);

@Schema()
export class Track extends Base {
  @Prop()
  callbackId: string;

  @Prop({
    autopopulate: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
  })
  user: User;

  @Prop({ type: [WalletSchema] })
  wallets: Wallet[];
}

export const TrackSchema = SchemaFactory.createForClass(Track);
