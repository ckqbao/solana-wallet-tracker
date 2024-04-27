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
  }

  private async initShyft() {
    this.shyft = new ShyftSdk({
      apiKey: this.configService.get('SHYFT_API_KEY'),
      network: Network.Mainnet,
    });
  }

  async clean() {
    const callbackList = await this.shyft.callback.list();
    for (const callback of callbackList) {
      await this.shyft.callback.remove({ id: callback.id });
    }
    await this.trackService.deleteAll();
  }

  async watchWallet(
    userId: string,
    wallet: Omit<Wallet, 'callbackId'>,
    callbackUrl: string,
  ) {
    const callback = await this.shyft.callback.register({
      network: Network.Mainnet,
      addresses: [wallet.address],
      callbackUrl,
      events: eventWatchList,
    });
    const track = await this.trackService.getByUserId(userId);
    if (track) {
      await this.trackService.addWallet(userId, {
        ...wallet,
        callbackId: callback.id,
      });
    } else {
      await this.trackService.create({
        wallets: [{ ...wallet, callbackId: callback.id }],
        user: userId,
      });
    }
  }

  async unwatchWallets(userId: string, wallets: Partial<Wallet>[]) {
    const track = await this.trackService.getByUserId(userId);
    if (!track) return;
    const filterdWallets = track.wallets.filter(({ address, name }) =>
      wallets.find(
        (wallet) =>
          wallet.address?.includes(address) || wallet.name?.includes(name),
      ),
    );

    for (const wallet of filterdWallets) {
      await this.shyft.callback.remove({
        id: wallet.callbackId,
      });
    }
    await this.trackService.removeWallets(
      userId,
      filterdWallets.map((wallet) => wallet.address),
    );
  }
}
