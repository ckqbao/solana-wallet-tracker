import { Global, Module } from '@nestjs/common';
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose';

import { Track, TrackSchema } from './schema/track.schema';
import { User, UserSchema } from './schema/user.schema';

import { TrackService } from './services/track.service';
import { UserService } from './services/user.service';

const MODELS: ModelDefinition[] = [
  { name: Track.name, schema: TrackSchema },
  { name: User.name, schema: UserSchema },
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  providers: [TrackService, UserService],
  exports: [MongooseModule, TrackService, UserService],
})
export class DatabaseModule {}
