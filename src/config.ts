import dotenv from 'dotenv';

// Load .env.local first (if exists), then .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // This will override with .env if it exists

export interface Config {
  baseRpcUrl: string;
  aptosRpcUrl: string;
  baseSponsorPrivateKey: string;
  aptosSponsorPrivateKey: string;
  networkType: 'Mainnet' | 'Testnet';
  // Circle CCTP contract addresses (optional, defaults provided by SDK)
  baseUsdcAddress?: string;
  baseTokenMessengerAddress?: string;
  baseMessageTransmitterAddress?: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

export const config: Config = {
  baseRpcUrl: getRequiredEnv('BASE_RPC_URL'),
  aptosRpcUrl: getRequiredEnv('APTOS_RPC_URL'),
  baseSponsorPrivateKey: getRequiredEnv('BASE_SPONSOR_PRIVATE_KEY'),
  aptosSponsorPrivateKey: getRequiredEnv('APTOS_SPONSOR_PRIVATE_KEY'),
  networkType: (getOptionalEnv('NETWORK_TYPE') || 'Testnet') as 'Mainnet' | 'Testnet',
  baseUsdcAddress: getOptionalEnv('BASE_USDC_ADDRESS'),
  baseTokenMessengerAddress: getOptionalEnv('BASE_TOKEN_MESSENGER_ADDRESS'),
  baseMessageTransmitterAddress: getOptionalEnv('BASE_MESSAGE_TRANSMITTER_ADDRESS'),
};

/**
 * Create a Config object programmatically (for SDK usage without env vars)
 * @param config - Partial or complete config object
 * @returns Complete Config object
 */
export function createConfig(override: Partial<Config>): Config {
  // Try to load from env first, then override with provided values
  dotenv.config({ path: '.env.local' });
  dotenv.config();
  
  return {
    baseRpcUrl: override.baseRpcUrl || getRequiredEnv('BASE_RPC_URL'),
    aptosRpcUrl: override.aptosRpcUrl || getRequiredEnv('APTOS_RPC_URL'),
    baseSponsorPrivateKey: override.baseSponsorPrivateKey || getRequiredEnv('BASE_SPONSOR_PRIVATE_KEY'),
    aptosSponsorPrivateKey: override.aptosSponsorPrivateKey || getRequiredEnv('APTOS_SPONSOR_PRIVATE_KEY'),
    networkType: override.networkType || (getOptionalEnv('NETWORK_TYPE') || 'Testnet') as 'Mainnet' | 'Testnet',
    baseUsdcAddress: override.baseUsdcAddress || getOptionalEnv('BASE_USDC_ADDRESS'),
    baseTokenMessengerAddress: override.baseTokenMessengerAddress || getOptionalEnv('BASE_TOKEN_MESSENGER_ADDRESS'),
    baseMessageTransmitterAddress: override.baseMessageTransmitterAddress || getOptionalEnv('BASE_MESSAGE_TRANSMITTER_ADDRESS'),
  };
}
