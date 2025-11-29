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
import { config } from "./config";
import { getEvmSigner, getAptosSigner } from "./helper";
import { TransferResult } from "./types";

export interface CctpTransferRequest {
  amount: string; // Amount in USDC (e.g., "1.0")
  destAddress?: string; // Aptos recipient address (hex format)
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
    
    // Initialize Wormhole SDK with EVM and Aptos platforms
    const wh = await wormhole(network, [evm, aptos], {
      chains: {
        Base: {
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

    // Get chain contexts
    const srcChain = wh.getChain("Base");
    const dstChain = wh.getChain("Aptos");

    // Parse amount - USDC has 6 decimals
    const amountBigInt = BigInt(Math.floor(parseFloat(request.amount) * 1_000_000));
    console.log(`💰 Amount: ${request.amount} USDC (${amountBigInt.toString()} smallest units)`);

    // Use destination address if provided, otherwise use sponsor wallet
    const recipientAddress = request.destAddress || aptosSigner.address;
    console.log(`📬 Recipient: ${recipientAddress}`);

    // Create Circle CCTP transfer
    console.log(`🚀 Starting CCTP Transfer...`);
    
    // Create ChainAddress objects - the SDK expects these to be in ChainAddress format
    // Using chainAddress method from chain context or Wormhole static method
    const senderAddress = srcChain.chainAddress(baseSigner.address);
    const receiverAddress = dstChain.chainAddress(recipientAddress);
    
    const circleTransfer = await wh.circleTransfer(
      amountBigInt,
      senderAddress,
      receiverAddress,
      false, // manual mode (not automatic)
      undefined, // no payload
      0 // no native gas
    );

    // Get transfer quote (optional, for informational purposes)
    const quote = await CircleTransfer.quoteTransfer(
      srcChain.chain,
      dstChain.chain,
      circleTransfer.transfer
    );
    console.log(`📊 Transfer quote:`, quote);

    // Step 1: Initiate transfer on Base Sepolia
    console.log(`📤 Initiating transfer on Base Sepolia...`);
    const srcTxids = await circleTransfer.initiateTransfer(baseSigner.signer);
    const sourceTx = Array.isArray(srcTxids) ? srcTxids[0] : srcTxids;
    console.log(`✅ Sent Base transaction: ${sourceTx}`);

    // Step 2: Wait for Circle attestation
    console.log(`🕒 Waiting for Circle attestation (this may take 1-3 minutes)...`);
    
    // Poll for attestation with exponential backoff (max 3 minutes = 180000ms)
    let delay = 2000; // Start with 2 seconds
    const maxTimeout = 180_000; // 3 minutes total
    const startTime = Date.now();
    let attestationIds: string[] | undefined;

    while (Date.now() - startTime < maxTimeout) {
      try {
        attestationIds = await circleTransfer.fetchAttestation(10000); // 10 second timeout per attempt
        if (attestationIds && attestationIds.length > 0) {
          console.log(`📜 Attestation received: ${attestationIds[0]}`);
          break;
        }
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        const remaining = maxTimeout - elapsed;
        
        if (remaining <= 0) {
          throw new Error(
            `Attestation not received after ${Math.floor(maxTimeout / 1000)} seconds. ` +
            `This can happen if Circle's attestation service is slow. ` +
            `Please check the transaction on Base Sepolia explorer and try again later.`
          );
        }

        // Check if it's just a timeout (attestation not ready yet)
        if (error.message?.includes('timeout') || error.message?.includes('not found')) {
          console.log(`⏳ Attestation not ready yet, waiting ${delay / 1000}s (elapsed: ${Math.floor(elapsed / 1000)}s)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 30000); // Max 30 seconds between attempts
        } else {
          throw error;
        }
      }
    }

    if (!attestationIds || attestationIds.length === 0) {
      throw new Error(
        `Attestation not received after ${Math.floor(maxTimeout / 1000)} seconds. ` +
        `Please check the transaction on Base Sepolia explorer and try again later.`
      );
    }

    // Step 3: Complete transfer on Aptos
    console.log(`💸 Completing transfer on Aptos...`);
    const dstTxids = await circleTransfer.completeTransfer(aptosSigner.account);
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

