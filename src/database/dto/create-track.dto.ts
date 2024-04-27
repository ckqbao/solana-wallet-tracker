import { Wallet } from '../schema/track.schema';

export class CreateTrackDto {
  user: string;
  wallets?: Wallet[];
}
