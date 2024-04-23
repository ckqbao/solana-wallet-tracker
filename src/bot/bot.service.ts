import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Composer, Markup, Scenes, Telegraf, session } from 'telegraf';

import { MonitorService } from '@/monitor/monitor.service';
import { UserService } from '@/database/services/user.service';
import { TrackService } from '@/database/services/track.service';
import { validateSolanaAddress } from '@/utils/validate-wallet';
import { TrackTransactionDto } from '@/monitor/dto/track-transaction.dto';
import { ignoredInNotificationTokenAddresses } from '@/monitor/utils/tokens';
import { Wallet } from '@/database/schema/track.schema';

@Injectable()
export class BotService {
  bot: Telegraf<Scenes.WizardContext>;
  private stage = new Scenes.Stage<Scenes.WizardContext>([]);

  constructor(
    private configService: ConfigService,
    private monitorService: MonitorService,
    private trackService: TrackService,
    private userService: UserService,
  ) {
    this.initBot();
  }

  private async initBot() {
    this.bot = new Telegraf<Scenes.WizardContext>(
      this.configService.get('TELEGRAM_BOT_TOKEN'),
    );
    this.bot.use(session());
    this.bot.use(this.stage.middleware());

    this.bot.start((ctx) => ctx.reply('Welcome'));

    this.registerListAddressesCommand();
    this.registerAddAddressCommand();
    this.registerRemoveAddressesCommand();

    // this.bot.command('abort', (ctx) => {
    //   ctx.scene.leave();
    // });

    await this.bot.telegram.setMyCommands([
      { command: 'add', description: 'Add address' },
      { command: 'remove', description: 'Remove address' },
      { command: 'list', description: 'List tracked wallets' },
    ]);

    await this.bot.launch();
  }

  private async registerListAddressesCommand() {
    this.bot.command('list', async (ctx) => {
      const user = await this.userService.getOrCreate({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
      });
      const track = await this.trackService.getByUserId(user._id.toString());
      if (!track) {
        ctx.reply('No wached wallet');
        return;
      }
      ctx.reply(
        track.wallets
          .map((wallet) => `${wallet.name} - ${wallet.address}`)
          .join('\n'),
      );
    });
  }

  private async registerAddAddressCommand() {
    this.bot.command('add', async (ctx) => {
      const user = await this.userService.getOrCreate({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
      });

      const addAddressSceneId = 'ADD_ADDRESS_SCENE';
      const addAddressScene =
        this.stage.scenes.get(addAddressSceneId) ??
        new Scenes.WizardScene(
          addAddressSceneId,
          async (ctx) => {
            await ctx.reply('Please enter the address you want to track:');
            ctx.scene.state = {};
            return ctx.wizard.next();
          },
          async (ctx) => {
            if (!ctx.message) return;
            if (ctx.message['text'] === 'abort') {
              await ctx.reply('cancelled');
              return ctx.scene.leave();
            }

            const address = ctx.message['text'] as string;
            if (!validateSolanaAddress(address)) {
              await ctx.reply('Please provide a valid address.');
              return;
            }
            const track = await this.trackService.getByUserId(
              user._id.toString(),
            );
            if (track?.wallets.find((wallet) => wallet.address === address)) {
              await ctx.reply(
                'Address is already added, please choose another.',
              );
              return;
            }
            ctx.scene.state['address'] = address;
            await ctx.reply('Please name the wallet:');
            return ctx.wizard.next();
          },
          async (ctx) => {
            if (!ctx.message) return;
            if (ctx.message['text'] === 'abort') {
              await ctx.reply('cancelled');
              return ctx.scene.leave();
            }

            const walletName = ctx.message['text'] as string;

            await this.monitorService.watchWallet(
              user._id.toString(),
              { address: ctx.scene.state['address'], name: walletName },
              `${this.configService.get('DOMAIN_URL')}/api/monitors/transactions?chatId=${ctx.chat.id}&walletName=${walletName}`,
            );
            await ctx.reply('tracked');
            return ctx.scene.leave();
          },
        );
      this.stage.scenes.set(addAddressSceneId, addAddressScene);
      ctx.scene.enter(addAddressSceneId);
    });
  }

  private async registerRemoveAddressesCommand() {
    this.bot.command('remove', async (ctx) => {
      const removeAddressScene = this.getOrCreateRemoveAddressScene();
      this.stage.scenes.set(removeAddressScene.id, removeAddressScene);
      ctx.scene.enter(removeAddressScene.id);
    });
  }

  private getOrCreateRemoveAddressScene() {
    const removeAddressSceneId = 'REMOVE_ADDRESS_SCENE';
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action('address', async (ctx) => {
      ctx.scene.state['removedBy'] = 'address';
      await ctx.reply('Enter the address:');
      return ctx.wizard.next();
    });
    stepHandler.action('walletName', async (ctx) => {
      ctx.scene.state['removedBy'] = 'walletName';
      await ctx.reply('Enter the wallet name:');
      return ctx.wizard.next();
    });
    return (
      this.stage.scenes.get(removeAddressSceneId) ??
      new Scenes.WizardScene(
        removeAddressSceneId,
        async (ctx) => {
          await ctx.reply(
            'Remove by address or wallet name ?',
            Markup.inlineKeyboard([
              Markup.button.callback('Address', 'address'),
              Markup.button.callback('Wallet name', 'walletName'),
            ]),
          );
          return ctx.wizard.next();
        },
        stepHandler,
        async (ctx) => {
          if (
            ctx.scene.state['removedBy'] !== 'address' &&
            ctx.scene.state['removedBy'] !== 'walletName'
          )
            return;

          if (ctx.message['text'] === 'abort') {
            await ctx.reply('cancelled');
            return ctx.scene.leave();
          }

          if (!validateSolanaAddress(ctx.message['text'])) {
            ctx.reply('Please enter a valid address.');
            return;
          }
          const user = await this.userService.getOrCreate({
            telegramId: ctx.from.id,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            username: ctx.from.username,
          });
          const wallet: Partial<Wallet> = {};
          if (ctx.scene.state['removedBy'] === 'address')
            wallet.address = ctx.message['text'] as string;
          if (ctx.scene.state['removedBy'] === 'walletName')
            wallet.name = ctx.message['text'] as string;
          await this.monitorService.unwatchWallets(user._id.toString(), [
            wallet,
          ]);
          await ctx.reply('removed');
          return await ctx.scene.leave();
        },
      )
    );
  }

  async notifyTransaction(
    chatId: string,
    txnSignature: string,
    swappedTokens: TrackTransactionDto['actions'][number]['info']['tokens_swapped'],
    walletName: string,
  ) {
    let message =
      `${walletName}\n` +
      `${swappedTokens.in.amount} ${swappedTokens.in.symbol} <=> ${swappedTokens.out.amount} ${swappedTokens.out.symbol}\n`;

    if (
      !ignoredInNotificationTokenAddresses.includes(
        swappedTokens.in.token_address,
      )
    ) {
      message +=
        `${swappedTokens.in.symbol}: ` +
        '`' +
        swappedTokens.in.token_address +
        '`' +
        ` - Chart: [Dexscreener](https://dexscreener.com/solana/${swappedTokens.in.token_address}) | [Photon](https://photon-sol.tinyastro.io/en/lp/${swappedTokens.in.token_address})\n`;
    }

    if (
      !ignoredInNotificationTokenAddresses.includes(
        swappedTokens.out.token_address,
      )
    ) {
      message +=
        `${swappedTokens.out.symbol}: ` +
        '`' +
        swappedTokens.out.token_address +
        '`' +
        ` - Chart: [Dexscreener](https://dexscreener.com/solana/${swappedTokens.out.token_address}) | [Photon](https://photon-sol.tinyastro.io/en/lp/${swappedTokens.out.token_address})\n`;
    }
    message += `Transaction link: [txn](https://solscan.io/tx/${txnSignature})\n`;

    this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: true,
      },
    });
  }
}
