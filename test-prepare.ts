/**
 * Test Preparation Script
 * 
 * This script helps prepare for testing by:
 * 1. Checking environment setup
 * 2. Fetching required contract addresses from Wormhole SDK
 * 3. Validating configuration
 */

import { config } from './src/config.js';
import axios from 'axios';

// Known Wormhole testnet addresses
const KNOWN_ADDRESSES = {
  testnet: {
    aptos: {
      // These can be fetched from Wormhole docs or SDK
      // For now using placeholder - will fetch or use known values
      tokenBridge: process.env.APTOS_TOKEN_BRIDGE_ADDRESS || '',
    }
  }
};

async function getAptosTokenBridgeFromSDK(): Promise<string | null> {
  try {
    // Try to get from Wormhole API or use known address
    // The known testnet address from ARCHITECTURE.md
    return '0x576410486a2da45eee6c949c995670112ddf2fbeedab20350d506328eefc9d4f';
  } catch (error) {
    console.error('Failed to fetch Token Bridge address:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Preparing for Test...\n');
  console.log('─'.repeat(60));
  
  // Check if .env file exists
  console.log('\n📁 Checking Environment...');
  const hasEnv = config.baseRpcUrl && config.aptosRpcUrl;
  
  if (!hasEnv) {
    console.log('❌ Missing environment variables!');
    console.log('   Please create a .env file with required variables.');
    console.log('   See README.md for template.');
    return;
  }
  
  console.log('✅ Environment file found');
  
  // Check required variables
  console.log('\n📋 Required Configuration:');
  const required = [
    { name: 'BASE_RPC_URL', value: config.baseRpcUrl },
    { name: 'APTOS_RPC_URL', value: config.aptosRpcUrl },
    { name: 'BASE_SPONSOR_PRIVATE_KEY', value: config.baseSponsorPrivateKey, mask: true },
    { name: 'APTOS_SPONSOR_PRIVATE_KEY', value: config.aptosSponsorPrivateKey, mask: true },
  ];
  
  let missing = false;
  for (const req of required) {
    if (!req.value) {
      console.log(`❌ ${req.name}: MISSING`);
      missing = true;
    } else {
      const display = req.mask ? `${req.value.substring(0, 10)}...` : req.value;
      console.log(`✅ ${req.name}: ${display}`);
    }
  }
  
  // Check Aptos Token Bridge address
  console.log('\n🔧 Aptos Token Bridge Configuration:');
  let tokenBridgeAddress = config.aptosTokenBridgeAddress;
  
  if (!tokenBridgeAddress) {
    console.log('⚠️  APTOS_TOKEN_BRIDGE_ADDRESS not set');
    console.log('   Fetching known testnet address...');
    tokenBridgeAddress = await getAptosTokenBridgeFromSDK();
    
    if (tokenBridgeAddress) {
      console.log(`✅ Found: ${tokenBridgeAddress}`);
      console.log('\n💡 Add this to your .env file:');
      console.log(`   APTOS_TOKEN_BRIDGE_ADDRESS=${tokenBridgeAddress}`);
    } else {
      console.log('❌ Could not determine Token Bridge address');
      console.log('   You need to set APTOS_TOKEN_BRIDGE_ADDRESS in .env');
    }
  } else {
    console.log(`✅ APTOS_TOKEN_BRIDGE_ADDRESS: ${tokenBridgeAddress}`);
  }
  
  // Check USDC Coin Type
  console.log('\n💰 Aptos USDC Coin Type:');
  if (!config.aptosUsdcCoinType) {
    console.log('❌ APTOS_USDC_COIN_TYPE: MISSING');
    console.log('   Format: 0x<address>::coin::USDC');
    console.log('   You need to find the testnet USDC coin type on Aptos');
    console.log('   This might need to be attested first if using wrapped USDC');
  } else {
    console.log(`✅ APTOS_USDC_COIN_TYPE: ${config.aptosUsdcCoinType}`);
  }
  
  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('📊 Test Readiness Check:');
  console.log('─'.repeat(60));
  
  const ready = !missing && tokenBridgeAddress && config.aptosUsdcCoinType;
  
  if (ready) {
    console.log('\n✅ Ready to test!');
    console.log('\n📝 Next steps:');
    console.log('   1. Ensure wallets have gas tokens:');
    console.log('      - Base Sepolia wallet: ETH for gas');
    console.log('      - Aptos wallet: APT for gas');
    console.log('   2. Get testnet USDC on Base Sepolia (if needed)');
    console.log('   3. Run: npx tsx src/runTransferWormhole.ts');
  } else {
    console.log('\n⚠️  Not ready yet. Please fix the missing items above.');
  }
  
  console.log('\n');
}

main().catch(console.error);


