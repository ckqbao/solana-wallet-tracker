import { Global, Module } from '@nestjs/common'
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose'

import { Account, AccountSchema } from './schema/account.schema'
import { Track, TrackSchema } from './schema/track.schema'
import { User, UserSchema } from './schema/user.schema'
import { Wallet, WalletSchema } from './schema/wallet.schema'

import { SubscriptionRepository } from './repository/subscription.repository'
import { TrackRepository } from './repository/track.repository'
import { UserRepository } from './repository/user.repository'
import { WalletRepository } from './repository/wallet.repository'
import { Subscription, SubscriptionSchema } from './schema/subscription.schema'

const MODELS: ModelDefinition[] = [
  { name: Account.name, schema: AccountSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: Track.name, schema: TrackSchema },
  { name: User.name, schema: UserSchema },
  { name: Wallet.name, schema: WalletSchema },
]

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  providers: [SubscriptionRepository, TrackRepository, UserRepository, WalletRepository],
  exports: [MongooseModule, SubscriptionRepository, TrackRepository, UserRepository, WalletRepository],
})
export class DatabaseModule {}
