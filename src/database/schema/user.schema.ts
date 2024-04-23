import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './base.schema';

@Schema()
export class User extends Base {
  @Prop()
  telegramId: number;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  username: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
