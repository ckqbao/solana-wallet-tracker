import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import dayjs from 'dayjs'
import { UpdateQuery, Model, Types } from 'mongoose'

import { CreateSubscriptionDto } from '../dto/create-subscription.dto'
import { Subscription } from '../schema/subscription.schema'

@Injectable()
export class SubscriptionRepository {
  constructor(@InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>) {}

  async createSubscription(createSubscriptionDto: CreateSubscriptionDto) {
    const subscription = await this.subscriptionModel.create(createSubscriptionDto)
    subscription.expiredAt = dayjs(subscription.createdAt).add(1, 'month').toDate()
    return await subscription.save()
  }

  async updateSubscription(subscriptionId: string | Types.ObjectId, update: UpdateQuery<Subscription>) {
    await this.subscriptionModel.findByIdAndUpdate(subscriptionId, update)
  }
}
