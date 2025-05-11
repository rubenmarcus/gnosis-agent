import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl } from '../utils';

// GraphQL query for Symmetric liquidity pools with enhanced schema
const SYMMETRIC_POOLS_QUERY = `
  query getTopPools {
    pools(first: 10, orderBy: totalLiquidity, orderDirection: desc) {
      id
      address
      poolType
      poolTypeVersion
      totalLiquidity
      totalSwapVolume
      totalSwapFee
      swapFee
      tokens {
        symbol
        balance
        address
      }
    }
    balancers(first: 1) {
      id
      poolCount
      totalLiquidity
    }
  }
`;

// Interface for Symmetric GraphQL response with enhanced schema
interface SymmetricPoolsResponse {
  pools: {
    id: string;
    address: string;
    poolType: string;
    poolTypeVersion: number;
    totalLiquidity: string;
    totalSwapVolume: string;
    totalSwapFee: string;
    swapFee: string;
    tokens: {
      symbol: string;
      balance: string;
      address: string;
    }[];
  }[];
  balancers: {
    id: string;
    poolCount: number;
    totalLiquidity: string;
  }[];
}

/**
 * Fetches top liquidity pools from Symmetric and transforms them into strategies
 */
export async function getSymmetricStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<SymmetricPoolsResponse>(
      GRAPH_CONFIG.ENDPOINTS.symmetric,
      SYMMETRIC_POOLS_QUERY
    );

    if (!data.pools || !data.pools.length) {
      return [];
    }

    return data.pools.map((pool): Strategy => {
      const tokens = pool.tokens.map(t => t.symbol);
      const asset = tokens.join('-');
      const tvl = Number.parseFloat(pool.totalLiquidity);
      const volume = Number.parseFloat(pool.totalSwapVolume);
      const fees = Number.parseFloat(pool.totalSwapFee);

      // Estimate daily volume and fees (approximate last 24h as 1% of total)
      const dailyVolume = volume * 0.01;
      const dailyFees = fees * 0.01;

      // Estimate APY based on fees
      const estimatedApy = tvl > 0 ? (dailyFees * 365 * 100) / tvl : 0;

      // Check if pool contains stablecoins
      const hasStablecoins = tokens.some(symbol =>
        ['USDC', 'USDT', 'DAI', 'XDAI'].includes(symbol)
      );

      // Determine if it's a stable-stable pool
      const isStableSwap = hasStablecoins &&
        tokens.every(symbol => ['USDC', 'USDT', 'DAI', 'XDAI'].includes(symbol));

      return {
        id: `symmetric-${pool.id}`,
        name: `Symmetric ${asset} Pool`,
        protocol: 'Symmetric',
        asset,
        type: 'Liquidity Providing',
        description: `Provide liquidity to the ${asset} pool on Symmetric (${pool.poolType})`,
        apy: `${estimatedApy.toFixed(2)}%`,
        riskLevel: getRiskLevel(estimatedApy, {
          isStablecoin: hasStablecoins,
          isStableSwap,
          impermanentLossRisk: isStableSwap ? 'low' : tokens.length > 2 ? 'medium' : 'high'
        }),
        tvl: formatTVL(tvl),
        link: getProjectUrl('Symmetric'),
        network: 'gnosis',
        tags: [
          'balancer',
          'lp',
          isStableSwap ? 'stableswap' : (hasStablecoins ? 'stablecoin' : 'volatile'),
          tokens.length > 2 ? 'multi-asset' : 'pair',
          pool.poolType.toLowerCase(),
          `v${pool.poolTypeVersion}`
        ],
        minInvestment: '10 xDAI equivalent',
        lastUpdated: new Date().toISOString(),
        totalVolume24h: formatTVL(dailyVolume),
        feesEarned24h: formatTVL(dailyFees),
        reserves: pool.tokens.map(t => t.balance)
      };
    });
  } catch (error) {
    console.error('Error fetching Symmetric pools:', error);
    return [];
  }
}