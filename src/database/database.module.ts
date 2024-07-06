import { Global, Module } from '@nestjs/common'
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose'

import { Account, AccountSchema } from './schema/account.schema'
import { Track, TrackSchema } from './schema/track.schema'
import { User, UserSchema } from './schema/user.schema'
import { Wallet, WalletSchema } from './schema/wallet.schema'

import { TrackService } from './services/track.service'
import { UserService } from './services/user.service'
import { WalletService } from './services/wallet.service'

const MODELS: ModelDefinition[] = [
  { name: Account.name, schema: AccountSchema },
  { name: Track.name, schema: TrackSchema },
  { name: User.name, schema: UserSchema },
  { name: Wallet.name, schema: WalletSchema },
]

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  providers: [TrackService, UserService, WalletService],
  exports: [MongooseModule, TrackService, UserService, WalletService],
})
export class DatabaseModule {}
