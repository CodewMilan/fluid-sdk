/**
 * CCTP Wormhole Transfer SDK
 * 
 * Main entry point for the SDK. Exports all public APIs for cross-chain
 * USDC transfers from Base to Aptos using Circle CCTP via Wormhole.
 */

// Core transfer functionality
export { transferUsdcViaCctp } from './cctpTransfer';
export type { CctpTransferRequest } from './cctpTransfer';

// Transfer results
export type { TransferResult } from './types';

// Permit2 utilities
export {
  generatePermit2Signature,
  verifyPermit2Signature,
  createPermit,
  splitSignature,
  getPermit2Domain,
  getPermit2Types,
  getPermit2Address,
} from './permit2';

export type {
  Permit2Permit,
  Permit2Domain,
  Permit2Signature,
  Permit2Authorization,
} from './permit2';

// Helper functions for signers
export { getEvmSigner, getAptosSigner, toEvmSdkSigner, toAptosSdkSigner } from './helper';

export type { EvmSignerResult, AptosSignerResult } from './types';

// Configuration types (export for programmatic config)
export type { Config } from './config';
export { createConfig } from './config';

// Constants
export {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC,
  PERMIT2_ADDRESS,
} from './permit2';

