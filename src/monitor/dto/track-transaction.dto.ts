import { TxnAction } from '@shyft-to/js'

class SwapActionDto {
  type: 'SWAP'
  info: {
    swapper: string
    tokens_swapped: {
      in: {
        token_address: string
        name: string
        symbol: string
        image_uri: string
        amount: number
      }
      out: {
        token_address: string
        name: string
        symbol: string
        image_uri: string
        amount: number
      }
    }
    swaps: [
      {
        liquidity_pool_address: string
        name: string
        source: string
      },
    ]
  }
}

export class TrackTransactionDto {
  timestamp: string
  fee: number
  fee_payer: string
  signers: Array<string>
  signatures: Array<string>
  protocol: {
    address: string
    name: string
  }
  type: TxnAction
  status: string
  actions: SwapActionDto[]
  accounts: Array<any>
  triggered_for: string
}
