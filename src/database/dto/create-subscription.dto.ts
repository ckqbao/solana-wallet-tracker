import { Types } from 'mongoose'

export class CreateSubscriptionDto {
  transferedSol: number
  user: string | Types.ObjectId
}
