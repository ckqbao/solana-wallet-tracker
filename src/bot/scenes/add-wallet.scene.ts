import { ConfigService } from '@nestjs/config';
import { Command, Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { WizardContext } from 'telegraf/typings/scenes';

import { ADD_WALLET_SCENE_ID } from '@/app.constants';

import { MonitorService } from '@/monitor/monitor.service';
import { TrackService } from '@/database/services/track.service';
import { UserService } from '@/database/services/user.service';

import { validateSolanaAddress } from '@/utils/validate-wallet';

@Wizard(ADD_WALLET_SCENE_ID)
export class AddWalletScene {
  constructor(
    private configService: ConfigService,
    private monitorService: MonitorService,
    private trackService: TrackService,
    private userService: UserService,
  ) {}

  private async getUser(ctx: WizardContext) {
    return await this.userService.getOrCreate({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });
  }

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    ctx.wizard.next();
    return 'Please enter the address you want to track:';
  }

  @On('text')
  @WizardStep(2)
  async onAddress(@Ctx() ctx: WizardContext, @Message() msg: { text: string }) {
    const address = msg.text;
    if (!validateSolanaAddress(address)) {
      return 'Please provide a valid address.';
    }

    const user = await this.getUser(ctx);

    const track = await this.trackService.getByUserId(user._id.toString());
    if (track?.wallets.find((wallet) => wallet.address === address)) {
      return 'Address is already added, please choose another.';
    }

    ctx.wizard.state['address'] = address;
    ctx.wizard.next();
    return 'Please name the wallet:';
  }

  @On('text')
  @WizardStep(3)
  async onWalletName(
    @Ctx() ctx: WizardContext & { wizard: { state: { address: string } } },
    @Message() msg: { text: string },
  ) {
    if (msg.text === 'abort') {
      await ctx.scene.leave();
      return 'cancelled';
    }

    const user = await this.getUser(ctx);
    const walletName = msg.text;
    await this.monitorService.watchWallet(
      user._id.toString(),
      { address: ctx.wizard.state.address, name: walletName },
      `${this.configService.get('DOMAIN_URL')}/api/monitors/transactions?chatId=${ctx.chat.id}&walletName=${walletName}`,
    );

    await ctx.scene.leave();
    return 'tracked';
  }

  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave();
    return 'cancelled';
  }
}
