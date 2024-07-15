import { SHYFT_SDK } from '@/app.constants'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Network, ShyftSdk } from '@shyft-to/js'

export const shyftSdkProvider = {
  provide: SHYFT_SDK,
  useFactory: async (configService: ConfigService) => {
    return new ShyftSdk({
      apiKey: configService.get('SHYFT_API_KEY')!,
      network: Network.Mainnet,
    })
  },
  inject: [ConfigService],
}
