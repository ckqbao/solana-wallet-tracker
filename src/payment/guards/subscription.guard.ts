import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import dayjs from 'dayjs'
import { TelegrafException } from 'nestjs-telegraf'

import { SUBSCRIPTION_SOL_AMOUNT } from '@/app.constants'
import { CreateUserDto } from '@/database/dto/create-user.dto'
import { UserRepository } from '@/database/repository/user.repository'
import { getTelegrafContext } from '@/utils/telegraf.util'

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { from } = getTelegrafContext(context)
    const { freeTrial, subscription } = await this.userRepository.getOrCreate(plainToInstance(CreateUserDto, from))

    if (dayjs().isBefore(dayjs(freeTrial.startedAt).add(freeTrial.duration, freeTrial.durationUnit))) {
      return true
    }

    if (!subscription) {
      throw new TelegrafException('You need to subscribe to use our bot by using command /subscribe')
    }

    if (subscription.transferedSol < SUBSCRIPTION_SOL_AMOUNT) {
      throw new TelegrafException(`You need to transfer ${SUBSCRIPTION_SOL_AMOUNT - subscription.transferedSol} to finish the subscription`)
    }

    if (dayjs().isAfter(subscription.expiredAt)) {
      throw new TelegrafException('Your current subscription has expired. Please renew it to use the bot')
    }

    return true
  }
}
