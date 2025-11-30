/**
 * Permit2 EIP-712 Signature Generation and Verification
 * 
 * This module handles Permit2 authorization signatures for user wallet transfers.
 * Permit2 allows users to sign permissions for others to spend their tokens without
 * requiring a separate approval transaction.
 */

import { ethers, TypedDataEncoder } from "ethers";

/**
 * Permit2 EIP-712 Domain Separator structure
 */
export interface Permit2Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/**
 * Permit2 Permit structure for token authorization
 */
export interface Permit2Permit {
  owner: string;
  spender: string;
  token: string;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Permit2 signature components (split from raw signature)
 */
export interface Permit2Signature {
  r: string;
  s: string;
  v: number;
}

/**
 * Full Permit2 authorization data
 */
export interface Permit2Authorization {
  permit: Permit2Permit;
  signature: string; // Full signature hex string
  signatureComponents?: Permit2Signature; // Split signature (r, s, v)
}

/**
 * Permit2 contract address (same on all EVM chains)
 */
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/**
 * Base Sepolia Chain ID
 */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * Base Sepolia USDC address (testnet)
 */
export const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/**
 * Get Permit2 contract address for a given chain
 * Permit2 is a universal token approval contract deployed at the same address on all EVM chains
 */
export function getPermit2Address(): string {
  return PERMIT2_ADDRESS;
}

/**
 * Get the EIP-712 domain separator for Permit2
 * @param chainId - Chain ID (e.g., 84532 for Base Sepolia)
 * @param permit2Address - Permit2 contract address
 */
export function getPermit2Domain(chainId: number, permit2Address: string = getPermit2Address()): Permit2Domain {
  return {
    name: "Permit2",
    version: "1",
    chainId,
    verifyingContract: permit2Address,
  };
}

/**
 * Get Permit2 EIP-712 types for signing
 * Note: EIP712Domain is not included - ethers.js handles it automatically
 */
export function getPermit2Types() {
  return {
    PermitSingle: [
      { name: "details", type: "PermitDetails" },
      { name: "spender", type: "address" },
      { name: "sigDeadline", type: "uint256" },
    ],
    PermitDetails: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint160" }, // Note: Permit2 uses uint160 for amount
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  };
}

/**
 * Generate Permit2 EIP-712 signature
 * @param signer - Ethers wallet (user's wallet)
 * @param permit - Permit details
 * @param chainId - Chain ID
 * @returns Hex-encoded signature string
 */
export async function generatePermit2Signature(
  signer: ethers.Wallet,
  permit: Permit2Permit,
  chainId: number
): Promise<string> {
  const domain = getPermit2Domain(chainId);
  const types = getPermit2Types();

  // Convert value to uint160 (Permit2 uses uint160 for amounts)
  // Clamp to max uint160 value if needed
  const maxUint160 = BigInt("0xffffffffffffffffffffffffffffffffffffffff");
  const amount = permit.value > maxUint160 ? maxUint160 : permit.value;

  // Convert deadline to uint48
  const maxUint48 = BigInt("0xffffffffffff");
  const expiration = permit.deadline > maxUint48 ? maxUint48 : permit.deadline;

  // Convert nonce to uint48
  const nonce = permit.nonce > maxUint48 ? maxUint48 : permit.nonce;

  const value = {
    details: {
      token: permit.token,
      amount: amount.toString(),
      expiration: expiration.toString(),
      nonce: nonce.toString(),
    },
    spender: permit.spender,
    sigDeadline: permit.deadline.toString(),
  };

  // Sign the typed data
  // Use TypedDataEncoder to get the full digest, then sign it
  const encoder = new TypedDataEncoder(types);
  const digest = TypedDataEncoder.hash(domain, types, value);
  
  // Sign the digest
  const signature = await signer.signingKey.sign(digest);
  return signature.serialized;
}

/**
 * Verify Permit2 EIP-712 signature
 * @param permit - Permit details
 * @param signature - Hex-encoded signature string
 * @param chainId - Chain ID
 * @param expectedOwner - Expected owner address (to verify signature matches)
 * @returns true if signature is valid
 */
export function verifyPermit2Signature(
  permit: Permit2Permit,
  signature: string,
  chainId: number,
  expectedOwner: string
): boolean {
  try {
    const domain = getPermit2Domain(chainId);
    const types = getPermit2Types();

    // Convert value to uint160
    const maxUint160 = BigInt("0xffffffffffffffffffffffffffffffffffffffff");
    const amount = permit.value > maxUint160 ? maxUint160 : permit.value;

    // Convert deadline to uint48
    const maxUint48 = BigInt("0xffffffffffff");
    const expiration = permit.deadline > maxUint48 ? maxUint48 : permit.deadline;
    const nonce = permit.nonce > maxUint48 ? maxUint48 : permit.nonce;

    const value = {
      details: {
        token: permit.token,
        amount: amount.toString(),
        expiration: expiration.toString(),
        nonce: nonce.toString(),
      },
      spender: permit.spender,
      sigDeadline: permit.deadline.toString(),
    };

    // Recover the signer from the signature using TypedDataEncoder
    const digest = TypedDataEncoder.hash(domain, types, value);
    const recoveredAddress = ethers.recoverAddress(digest, signature);

    // Verify the recovered address matches the expected owner
    const matches = recoveredAddress.toLowerCase() === expectedOwner.toLowerCase();
    
    if (!matches) {
      console.error(`❌ Permit2 signature verification failed: recovered ${recoveredAddress}, expected ${expectedOwner}`);
    }
    
    return matches;
  } catch (error: any) {
    console.error(`❌ Error verifying Permit2 signature:`, error.message);
    return false;
  }
}

/**
 * Split signature into components (r, s, v)
 * @param signature - Hex-encoded signature string
 * @returns Signature components
 */
export function splitSignature(signature: string): Permit2Signature {
  const sig = ethers.Signature.from(signature);
  return {
    r: sig.r,
    s: sig.s,
    v: sig.v,
  };
}

/**
 * Helper to create a permit with default deadline (1 hour from now)
 */
export function createPermit(
  owner: string,
  spender: string,
  token: string,
  value: bigint,
  nonce: bigint,
  deadlineOffsetSeconds: number = 3600 // 1 hour default
): Permit2Permit {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineOffsetSeconds);
  
  return {
    owner,
    spender,
    token,
    value,
    nonce,
    deadline,
  };
}

