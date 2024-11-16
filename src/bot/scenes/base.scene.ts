import { Command } from 'nestjs-telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

export abstract class BaseScene {
  @Command('cancel')
  async onAbortCommand(ctx: WizardContext) {
    await ctx.scene.leave()
    return 'cancelled'
  }
}
