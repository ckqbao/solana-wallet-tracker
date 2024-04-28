import { Scenes, Telegraf } from 'telegraf';
import { Command, Ctx, Hears, InjectBot, Start, Update } from 'nestjs-telegraf';

import { ADD_WALLET_SCENE_ID, REMOVE_WALLET_SCENE_ID } from '@/app.constants';

import { TrackService } from '@/database/services/track.service';
import { UserService } from '@/database/services/user.service';

type Context = Scenes.WizardContext;

@Update()
export class BotUpdate {
  private stage = new Scenes.Stage<Scenes.WizardContext>([]);

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private trackService: TrackService,
    private userService: UserService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply('Welcome');
  }

  @Command('add')
  async onAddCommand(@Ctx() ctx: Context) {
    await ctx.scene.enter(ADD_WALLET_SCENE_ID);
  }

  @Command('remove')
  async onRemoveCommand(@Ctx() ctx: Context) {
    await ctx.scene.enter(REMOVE_WALLET_SCENE_ID);
  }

  @Command('list')
  async onListCommand(@Ctx() ctx: Context) {
    const user = await this.userService.getOrCreate({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });
    const track = await this.trackService.getByUserId(user._id.toString());
    if (track && !!track.wallets.length) {
      return track.wallets
        .map((wallet) => `${wallet.name} - ${wallet.address}`)
        .join('\n');
    }

    return 'No wached wallet';
  }

  @Command('setMyCommands')
  async onSetCommands() {
    await this.bot.telegram.setMyCommands([
      { command: 'add', description: 'Add address' },
      { command: 'remove', description: 'Remove address' },
      { command: 'list', description: 'List tracked wallets' },
    ]);
  }

  @Hears('Hi')
  async onHi() {
    return 'Hello';
  }
}
