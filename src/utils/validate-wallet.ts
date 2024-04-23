import { PublicKey } from '@solana/web3.js';

export const validateSolanaAddress = (address: string) => {
  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(address);
    return PublicKey.isOnCurve(publicKey.toBytes());
  } catch (err) {
    return false;
  }
};
