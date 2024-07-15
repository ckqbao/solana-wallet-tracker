import { TxnAction } from '@shyft-to/js'

class EasyProtocol {
  address: string
  name: string
}

export class SimplifiedTxnDto {
  timestamp: string
  fee: number
  fee_payer: string
  signatures: string[]
  signers: string[]
  type: TxnAction
  protocol: EasyProtocol
}
