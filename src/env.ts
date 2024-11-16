import { ConfigModuleOptions } from '@nestjs/config'
import { Network } from '@shyft-to/js'
import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  DOMAIN_URL: z.string(),
  ENABLE_MIGRATION: z.enum(['true', 'false']).transform((val) => val === 'true'),
  NETWORK: z.union([z.literal(Network.Mainnet), z.literal(Network.Devnet)]),
  PORT: z.coerce.number().default(3000),
  SHYFT_API_KEY: z.string(),
  TELEGRAM_BOT_TOKEN: z.string(),
})

export const validateEnv: ConfigModuleOptions['validate'] = (config) => {
  return envSchema.parse(config)
}

export type Env = z.infer<typeof envSchema>
