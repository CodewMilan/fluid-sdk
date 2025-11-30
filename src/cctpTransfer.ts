/**
 * CCTP (Circle Cross-Chain Transfer Protocol) Transfer Implementation
 * 
 * This file implements USDC transfers from Base Sepolia to Aptos using
 * Circle CCTP via Wormhole SDK. This is the method that Portal Bridge uses
 * and is the only method that works for Base Sepolia → Aptos transfers.
 */

import { wormhole, CircleTransfer, Network, Wormhole } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import aptos from "@wormhole-foundation/sdk/aptos";
import { ethers } from "ethers";
import { config } from "./config";
import { getEvmSigner, getAptosSigner, toEvmSdkSigner, toAptosSdkSigner } from "./helper";
import { TransferResult } from "./types";
import { verifyPermit2Signature, createPermit, getPermit2Address, type Permit2Permit } from "./permit2";

// Base Sepolia USDC address (testnet)
// TODO: Get this from SDK or make it configurable
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";


export interface CctpTransferRequest {
  amount: string; // Amount in USDC (e.g., "1.0")
  destAddress?: string; // Aptos recipient address (hex format)
  fromAddress?: string; // Optional: User's Base wallet address (if not provided, uses sponsor wallet)
  signature?: string; // Optional: User authorization signature
  // If signature is "dummy", uses placeholder validation
  // If signature is a valid Permit2 signature, uses real Permit2 verification
  // Permit data should be encoded in signature or provided separately
  permitData?: Permit2Permit; // Optional: Permit2 permit data for verification
}

/**
 * Verifies user authorization for the transfer
 * @param fromAddress - User's wallet address
 * @param amount - Transfer amount in smallest units
 * @param signature - Authorization signature (placeholder "dummy" for testing, or real Permit2 signature)
 * @param permitData - Optional Permit2 permit data for real signature verification
 * @param chainId - Chain ID for Permit2 domain verification
 * @returns true if authorization is valid
 */
async function verifyUserAuthorization(
  fromAddress: string,
  amount: bigint,
  signature: string,
  permitData?: Permit2Permit,
  chainId?: number
): Promise<boolean> {
  // Placeholder validation for testing
  if (signature === "dummy") {
    console.log(`⚠️  Using placeholder signature. In production, this must be replaced with Permit2 EIP-712 validation.`);
    return true;
  }
  
  if (!chainId) {
    console.error(`❌ Chain ID is required for Permit2 signature verification.`);
    return false;
  }
  
  // If permit data is not provided, reconstruct it from available parameters
  // This allows CLI usage without needing to pass full permit data
  let actualPermitData: Permit2Permit;
  
  if (permitData) {
    // Use provided permit data
    actualPermitData = permitData;
    
    // Verify that permit data matches expected values
    if (actualPermitData.owner.toLowerCase() !== fromAddress.toLowerCase()) {
      console.error(`❌ Permit owner (${actualPermitData.owner}) does not match fromAddress (${fromAddress})`);
      return false;
    }
    
    if (actualPermitData.value !== amount) {
      console.error(`❌ Permit amount (${actualPermitData.value}) does not match transfer amount (${amount})`);
      return false;
    }
    
    // Check if deadline has expired
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    if (actualPermitData.deadline < currentTime) {
      console.error(`❌ Permit deadline (${actualPermitData.deadline}) has expired (current time: ${currentTime})`);
      return false;
    }
  } else {
    // Reconstruct permit data from available parameters
    // Note: This uses defaults that may not match the actual permit
    // For production, permit data should be passed explicitly
    console.log(`⚠️  Reconstructing permit data from parameters (using defaults for nonce/deadline)`);
    
    // Reconstruct permit data - note that nonce and deadline may not match the actual signature
    // This is only for verification attempts - full permit data should be passed for accuracy
    actualPermitData = createPermit(
      fromAddress,
      getPermit2Address(), // Spender: Permit2 contract
      BASE_SEPOLIA_USDC, // Token: USDC on Base Sepolia
      amount,
      0n, // Nonce: default to 0 (may not match actual permit)
      3600 // Deadline offset: default 1 hour from now (in seconds)
    );
    
    console.log(`⚠️  Using reconstructed permit data. In production, pass permit data explicitly.`);
  }
  
  // Verify the Permit2 EIP-712 signature
  const isValid = verifyPermit2Signature(actualPermitData, signature, chainId, fromAddress);
  
  if (isValid) {
    console.log(`✅ Permit2 signature verified successfully`);
  } else {
    console.error(`❌ Permit2 signature verification failed`);
    if (!permitData) {
      console.error(`   Note: Permit data was reconstructed. The nonce/deadline may not match the signature.`);
      console.error(`   Please pass full permit data for accurate verification.`);
    }
  }
  
  return isValid;
}

/**
 * Transfers USDC from Base Sepolia to Aptos using Circle CCTP
 * @param request - Transfer request with amount and optional destination address
 * @returns Transfer result with transaction hashes and attestation IDs
 */
export async function transferUsdcViaCctp(
  request: CctpTransferRequest
): Promise<TransferResult> {
  try {
    const network: Network = config.networkType === "Mainnet" ? "Mainnet" : "Testnet";
    
    console.log(`🔑 Initializing Wormhole SDK with ${network} network...`);
    
    // For testnet, use "BaseSepolia" chain name; for mainnet use "Base"
    const srcChainName = network === "Testnet" ? "BaseSepolia" : "Base";
    
    // Initialize Wormhole SDK with EVM and Aptos platforms
    const wh = await wormhole(network, [evm, aptos], {
      chains: {
        [srcChainName]: {
          rpc: config.baseRpcUrl,
        },
        Aptos: {
          rpc: config.aptosRpcUrl,
        },
      },
    });

    console.log(`✅ Wormhole SDK initialized`);

    // Get signers
    console.log(`🔑 Initializing signers...`);
    const baseSigner = getEvmSigner(config.baseRpcUrl, config.baseSponsorPrivateKey);
    const aptosSigner = await getAptosSigner(config.aptosRpcUrl, config.aptosSponsorPrivateKey);
    
    console.log(`✅ Base signer: ${baseSigner.address}`);
    console.log(`✅ Aptos signer: ${aptosSigner.address}`);

    // Get chain contexts (srcChainName already defined above)
    const srcChain = wh.getChain(srcChainName);
    const dstChain = wh.getChain("Aptos");

    // Parse amount - USDC has 6 decimals
    const amountBigInt = BigInt(Math.floor(parseFloat(request.amount) * 1_000_000));

    // Determine source address (user wallet or sponsor wallet)
    const useUserWallet = !!request.fromAddress && !!request.signature;
    let sourceAddress: string;
    
    if (useUserWallet && request.fromAddress) {
      sourceAddress = request.fromAddress;
      
      // Get chain ID for Permit2 verification
      const network = await baseSigner.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Validate user authorization
      if (!request.signature) {
        throw new Error("Signature is required when using user wallet");
      }
      
      const isValid = await verifyUserAuthorization(
        sourceAddress,
        amountBigInt,
        request.signature,
        request.permitData,
        chainId
      );
      
      if (!isValid) {
        throw new Error("User authorization verification failed");
      }
      
      console.log(`👤 User Wallet (Source): ${sourceAddress}`);
      if (request.signature === "dummy") {
        console.log(`🧾 Authorization: Placeholder signature accepted`);
      } else {
        console.log(`🧾 Authorization: Permit2 signature verified`);
      }
      console.log(`🏦 Sponsor Wallet is paying all gas`);
    } else {
      sourceAddress = baseSigner.address;
      console.log(`💼 Using sponsor wallet as source`);
    }
    console.log(`💰 Amount: ${request.amount} USDC (${amountBigInt.toString()} smallest units)`);

    // Use destination address if provided, otherwise use sponsor wallet
    const recipientAddress = request.destAddress || aptosSigner.address;
    console.log(`📬 Recipient: ${recipientAddress}`);

    // Create Circle CCTP transfer
    console.log(`🚀 Starting CCTP Transfer...`);
    
    // Create ChainAddress objects using Wormhole static method
    // Note: sourceAddress is user wallet if provided, otherwise sponsor wallet
    const senderAddress = Wormhole.chainAddress(srcChainName, sourceAddress);
    const receiverAddress = Wormhole.chainAddress("Aptos", recipientAddress);
    
    const circleTransfer = await wh.circleTransfer(
      amountBigInt,
      senderAddress,
      receiverAddress,
      false, // manual mode (not automatic)
      undefined, // no payload
      0n // no native gas (BigInt literal as per user instruction)
    );

    // Get transfer quote (optional, for informational purposes)
    try {
      const quote = await CircleTransfer.quoteTransfer(
        srcChain,
        dstChain,
        circleTransfer.transfer
      );
      console.log(`📊 Transfer quote:`, quote);
    } catch (quoteError: any) {
      console.log(`⚠️  Could not get transfer quote (non-critical):`, quoteError.message);
      // Continue anyway - quote is optional
    }

    // Step 1: Initiate transfer on Base Sepolia
    console.log(`📤 Initiating transfer on Base Sepolia...`);
    
    // Refresh nonce to ensure we have the latest from network
    const currentNonce = await baseSigner.provider.getTransactionCount(baseSigner.address, 'pending');
    console.log(`📊 Current wallet nonce: ${currentNonce}`);
    
    // Wrap EVM signer into SDK Signer wrapper
    const baseSdkSigner = await toEvmSdkSigner(baseSigner.signer);
    const srcTxids = await circleTransfer.initiateTransfer(baseSdkSigner);
    const sourceTx = Array.isArray(srcTxids) ? srcTxids[0] : srcTxids;
    console.log(`✅ Sent Base transaction: ${sourceTx}`);

    // Step 2: Wait for Circle attestation
    console.log(`🕒 Waiting for Circle attestation (this may take 1-3 minutes)...`);
    
    // Fetch attestation with 180 second timeout (per user instruction)
    let attestationIds: string[] | undefined;
    try {
      attestationIds = await circleTransfer.fetchAttestation(180000); // 180 seconds timeout
      if (attestationIds && attestationIds.length > 0) {
        console.log(`📜 Attestation received: ${attestationIds[0]}`);
      } else {
        throw new Error('Attestation not received after timeout');
      }
    } catch (error: any) {
      throw new Error(
        `Attestation not received after 180 seconds. ` +
        `This can happen if Circle's attestation service is slow. ` +
        `Please check the transaction on Base Sepolia explorer and try again later. ` +
        `Error: ${error.message}`
      );
    }

    // Step 3: Complete transfer on Aptos
    console.log(`💸 Completing transfer on Aptos...`);
    // Wrap Aptos account into SDK Signer wrapper
    const aptosSdkSigner = toAptosSdkSigner(
      aptosSigner.account,
      aptosSigner.client,
      "Aptos"
    );
    const dstTxids = await circleTransfer.completeTransfer(aptosSdkSigner);
    const destinationTx = Array.isArray(dstTxids) ? dstTxids[0] : dstTxids;
    console.log(`✅ Completed Aptos transaction: ${destinationTx}`);

    console.log(`🎉 Finalized! USDC delivered to Aptos.`);

    return {
      success: true,
      sourceTx,
      attestationId: attestationIds[0],
      destinationTx,
    };
  } catch (error: any) {
    console.error(`❌ CCTP transfer failed:`, error.message);
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

