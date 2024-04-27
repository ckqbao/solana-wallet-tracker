import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Network, ShyftSdk } from '@shyft-to/js';

import { eventWatchList } from './utils/events';

import { TrackService } from '@/database/services/track.service';
import { Wallet } from '@/database/schema/track.schema';

@Injectable()
export class MonitorService {
  private shyft: ShyftSdk;

  constructor(
    private readonly configService: ConfigService,
    private trackService: TrackService,
  ) {
    this.initShyft();
    this.clean();
  }

  private async initShyft() {
    this.shyft = new ShyftSdk({
      apiKey: this.configService.get('SHYFT_API_KEY'),
      network: Network.Mainnet,
    });
  }

  private async clean() {
    const callbackList = await this.shyft.callback.list();
    for (const callback of callbackList) {
      await this.shyft.callback.remove({ id: callback.id });
    }
    await this.trackService.deleteAll();
  }

  async watchWallet(userId: string, wallet: Wallet, callbackUrl: string) {
    const track = await this.trackService.getByUserId(userId);
    if (track) {
      await this.shyft.callback.addAddresses({
        id: track.callbackId,
        addresses: [wallet.address],
      });
      await this.trackService.addWallet(userId, wallet);
    } else {
      const callback = await this.shyft.callback.register({
        network: Network.Mainnet,
        addresses: [wallet.address],
        callbackUrl,
        events: eventWatchList,
      });
      await this.trackService.create({
        callbackId: callback.id,
        wallets: [wallet],
        user: userId,
      });
    }
  }

  async unwatchWallets(userId: string, wallets: Partial<Wallet>[]) {
    const track = await this.trackService.getByUserId(userId);
    if (!track) return;
    const addresses = track.wallets
      .filter(({ address, name }) =>
        wallets.find(
          (wallet) =>
            wallet.address?.includes(address) || wallet.name?.includes(name),
        ),
      )
      .map((wallet) => wallet.address);

    const callback = await this.shyft.callback.removeAddresses({
      id: track.callbackId,
      addresses,
    });
    if (!callback.addresses.length) {
      await this.shyft.callback.remove({ id: track.callbackId });
      await this.trackService.deleteByUserId(userId);
    } else {
      await this.trackService.removeWallets(userId, addresses);
    }
  }
}
