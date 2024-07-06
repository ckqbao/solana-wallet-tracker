import { SHYFT_SDK } from '@/app.constants'
import { Inject } from '@nestjs/common'

export const InjectShyft = (): ParameterDecorator => Inject(SHYFT_SDK)
