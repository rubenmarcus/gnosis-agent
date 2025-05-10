// Token and Chain Types
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
  price?: {
    USD: number | null;
  };
  type?: string;
  lastUpdated?: string;
}

// Wallet Types
export interface WalletBalance {
  token: Token;
  balance: string;
  formattedBalance: string;
  usdValue: number;
  lastUpdated?: string;
}

// Portfolio Types
export interface PortfolioTotals {
  usdValue: number;
  tokenCount: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TokenData {
  tokens: WalletBalance[];
  totals: PortfolioTotals;
  isLoading: boolean;
  error: string;
}

export interface ChainData {
  id: string;
  name: string;
  logo: string;
  ankrName: string;
}

// API constants
const ANKR_API_ENDPOINT = 'https://rpc.ankr.com/multichain/';
const ANKR_API_KEY = process.env.ANKR_API_KEY;

// Interface for the Ankr API asset response
interface AnkrAsset {
  blockchain: string;
  contractAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimals?: number;
  thumbnail?: string;
  tokenPrice?: string;
  balance: string;
  balanceUsd?: string;
}

// Function to get the chainId from blockchain name
function getChainId(blockchain: string): number {
  const chainIds: Record<string, number> = {
    'gnosis': 100,
  };

  return chainIds[blockchain.toLowerCase()] || 1; // Default to Ethereum if unknown
}

// Check if address is a valid EVM address
function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function fetchMultiChainBalances(
  address: string,
  chain = 'eth'
): Promise<WalletBalance[]> {
  if (!isValidEvmAddress(address)) {
    console.warn('Invalid EVM address format, skipping Ankr API request');
    return [];
  }

  try {
    const response = await fetch(`${ANKR_API_ENDPOINT}${ANKR_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '1ff6b9e982ac9013a2bd1defd2d5ddc376eccab7fe1af74a85af32f7b5737cbb',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'ankr_getAccountBalance',
        params: {
          walletAddress: address,
          blockchain: chain,
        },
        id: 1,
      }),
    });


    console.log(response, 'response');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const result = data.result;

    if (!result?.assets) {
      return [];
    }

    return result.assets.map((asset: AnkrAsset) => {
      const chainId = getChainId(asset.blockchain);

      const token: Token = {
        address:
          asset.contractAddress || '0x0000000000000000000000000000000000000000',
        symbol: asset.tokenSymbol || asset.blockchain,
        name: asset.tokenName || 'Unknown',
        decimals: asset.tokenDecimals || 18,
        logoURI: asset.thumbnail,
        chainId,
        price: {
          USD: asset.tokenPrice ? Number.parseFloat(asset.tokenPrice) : null,
        },
      };

      return {
        token,
        balance: asset.balance,
        formattedBalance: asset.balance,
        usdValue: Number.parseFloat(asset.balanceUsd || '0'),
      };
    });
  } catch (error) {
    console.error('Error fetching multi-chain balances:', error);
    return [];
  }
}

export const formatBalance = (
  balance: string | number,
  decimals: number
): string => {
  const num =
    typeof balance === 'string' ? Number.parseFloat(balance) : balance;
  if (Number.isNaN(num)) return '0';
  return num.toFixed(decimals);
};

export const fetchEvmBalances = async (
  evmAddress: string,
): Promise<WalletBalance[]> => {
  if (!evmAddress) return [];

  const balances = await fetchMultiChainBalances(evmAddress, 'gnosis');

  return balances.map((balance) => ({
    ...balance,
    formattedBalance: formatBalance(balance.balance, balance.token.decimals),
  }));
};
