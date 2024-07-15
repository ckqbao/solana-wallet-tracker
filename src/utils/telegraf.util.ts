import { ExecutionContext } from '@nestjs/common'
import { TelegrafExecutionContext } from 'nestjs-telegraf'

import { Context } from '@/bot/interfaces/context.interface'

export function getTelegrafContext(context: ExecutionContext) {
  const ctx = TelegrafExecutionContext.create(context)
  return ctx.getContext<Context>()
}
