import { Context } from '@/bot/interfaces/context.interface'
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { TelegrafArgumentsHost } from 'nestjs-telegraf'

@Catch()
export class TelegrafExceptionFilter implements ExceptionFilter {
  async catch(exception: Error, host: ArgumentsHost): Promise<void> {
    const telegrafHost = TelegrafArgumentsHost.create(host)
    const ctx = telegrafHost.getContext<Context>()

    await ctx.replyWithHTML(`${exception.message}\n` + '💡<i>If you have any questions, please contact admin: baochow95@gmail.com</i>')
  }
}
