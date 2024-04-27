import {
  Action,
  Command,
  Ctx,
  Message,
  On,
  Wizard,
  WizardStep,
} from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { WizardContext } from 'telegraf/typings/scenes';

import { REMOVE_WALLET_SCENE_ID } from '@/app.constants';
import { validateSolanaAddress } from '@/utils/validate-wallet';

import { Wallet } from '@/database/schema/track.schema';

import { MonitorService } from '@/monitor/monitor.service';
import { TrackService } from '@/database/services/track.service';
import { UserService } from '@/database/services/user.service';

@Wizard(REMOVE_WALLET_SCENE_ID)
export class RemoveWalletScene {
  constructor(
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

  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave();
    return 'cancelled';
  }

  @WizardStep(1)
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    const user = await this.getUser(ctx);
    const track = await this.trackService.getByUserId(user._id.toString());
    if (!track) {
      await ctx.scene.leave();
      return 'You have no tracked wallet to remove';
    }
    await ctx.reply(
      'Remove by address or wallet name ?',
      Markup.inlineKeyboard([
        Markup.button.callback('Address', 'address'),
        Markup.button.callback('Wallet name', 'walletName'),
      ]),
    );
    ctx.wizard.next();
  }

  @Action(/address|walletName/)
  @WizardStep(2)
  async onRemoveByAddress(
    @Ctx() ctx: WizardContext & { update: Update.CallbackQueryUpdate },
  ) {
    const cbQuery = ctx.update.callback_query;
    const removedBy = 'data' in cbQuery ? cbQuery.data : null;
    ctx.wizard.state['removedBy'] = removedBy;
    switch (removedBy) {
      case 'address':
        ctx.wizard.next();
        return 'Enter the address:';
      case 'walletName':
        ctx.wizard.next();
        return 'Enter the wallet name:';
      default:
        ctx.scene.reset();
    }
  }

  @On('text')
  @WizardStep(3)
  async onRemove(
    @Ctx() ctx: WizardContext & { wizard: { state: { removedBy: string } } },
    @Message() msg: { text: string },
  ) {
    const removedBy = ctx.wizard.state.removedBy;
    if (removedBy === 'address' && !validateSolanaAddress(msg.text)) {
      return 'Please enter a valid address.';
    }

    const user = await this.userService.getOrCreate({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });

    const wallet: Partial<Wallet> = {};
    if (removedBy === 'address') wallet.address = ctx.message['text'] as string;
    if (removedBy === 'walletName') wallet.name = ctx.message['text'] as string;

    try {
      await this.monitorService.unwatchWallets(user._id.toString(), [wallet]);
    } catch {
      await ctx.scene.leave();
      return 'Unexpected error.';
    }
    await ctx.scene.leave();
    return 'removed';
  }
}
