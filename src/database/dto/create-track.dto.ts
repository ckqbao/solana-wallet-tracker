import { Wallet } from '../schema/track.schema';

export class CreateTrackDto {
  callbackId: string;
  user: string;
  wallets?: Wallet[];
}
