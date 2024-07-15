import { TxnAction } from '@shyft-to/js'
import { SimplifiedTxnDto } from './simplified-txn.dto'

class SolTransferActionDto {
  type: TxnAction.SOL_TRANSFER
  info: {
    sender: string
    receiver: string
    amount: number
  }
}

export class TrackSolTransferDto extends SimplifiedTxnDto {
  status: string
  actions: SolTransferActionDto[]
  triggered_for: string
}
