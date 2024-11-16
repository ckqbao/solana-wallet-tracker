import { SHYFT_SDK } from '@/app.constants'
import { Env } from '@/env'
import { ConfigService } from '@nestjs/config'
import { ShyftSdk } from '@shyft-to/js'

export const shyftSdkProvider = {
  provide: SHYFT_SDK,
  useFactory: async (configService: ConfigService<Env, true>) => {
    return new ShyftSdk({
      apiKey: configService.get('SHYFT_API_KEY')!,
      network: configService.get('NETWORK', { infer: true }),
    })
  },
  inject: [ConfigService],
}
