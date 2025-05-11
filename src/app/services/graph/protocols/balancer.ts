import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl, getStrategyType } from '../utils';

// Query for Balancer pools
const BALANCER_POOLS_QUERY = `
  query getTopPools {
    pools(
      first: 20,
      orderBy: totalLiquidity,
      orderDirection: desc
    ) {
      id
      address
      name
      symbol
      poolType
      totalLiquidity
      totalSwapVolume
      totalSwapFee
      swapFee
      tokens {
        address
        symbol
        name
        decimals
        weight
        balance
      }
    }
  }
`;

// Query for a specific pool
const BALANCER_POOL_QUERY = `
  query getPool($id: ID!) {
    pool(id: $id) {
      id
      address
      name
      symbol
      poolType
      totalLiquidity
      totalSwapVolume
      totalSwapFee
      swapFee
      tokens {
        address
        symbol
        name
        decimals
        weight
        balance
      }
    }
  }
`;

// Query for factories
const BALANCER_FACTORIES_QUERY = `
  query getFactories {
    factories(first: 10) {
      id
      poolCount
      totalLiquidity
    }
  }
`;

// Query for weighted pools
const BALANCER_WEIGHTED_POOLS_QUERY = `
  query getWeightedPools {
    pools(
      first: 20,
      where: { poolType_contains: "Weighted" },
      orderBy: totalLiquidity,
      orderDirection: desc
    ) {
      id
      address
      name
      symbol
      poolType
      totalLiquidity
      totalSwapVolume
      totalSwapFee
      swapFee
      tokens {
        address
        symbol
        name
        decimals
        weight
        balance
      }
      weightedParams {
        id
      }
    }
  }
`;

// Query for stable pools
const BALANCER_STABLE_POOLS_QUERY = `
  query getStablePools {
    pools(
      first: 20,
      where: { poolType_contains: "Stable" },
      orderBy: totalLiquidity,
      orderDirection: desc
    ) {
      id
      address
      name
      symbol
      poolType
      totalLiquidity
      totalSwapVolume
      totalSwapFee
      swapFee
      tokens {
        address
        symbol
        name
        decimals
        balance
      }
      stableParams {
        id
        amp
      }
    }
  }
`;

// Interfaces for Balancer response types
interface BalancerPoolsResponse {
  pools: {
    id: string;
    address: string;
    name: string;
    symbol: string;
    poolType: string;
    totalLiquidity: string;
    totalSwapVolume: string;
    totalSwapFee: string;
    swapFee: string;
    tokens: {
      address: string;
      symbol: string;
      name: string;
      decimals: string;
      weight?: string;
      balance: string;
    }[];
  }[];
}

interface BalancerPoolResponse {
  pool: {
    id: string;
    address: string;
    name: string;
    symbol: string;
    poolType: string;
    totalLiquidity: string;
    totalSwapVolume: string;
    totalSwapFee: string;
    swapFee: string;
    tokens: {
      address: string;
      symbol: string;
      name: string;
      decimals: string;
      weight?: string;
      balance: string;
    }[];
  };
}

interface BalancerFactoriesResponse {
  factories: {
    id: string;
    poolCount: string;
    totalLiquidity: string;
  }[];
}

interface BalancerWeightedPoolsResponse {
  pools: {
    id: string;
    address: string;
    name: string;
    symbol: string;
    poolType: string;
    totalLiquidity: string;
    totalSwapVolume: string;
    totalSwapFee: string;
    swapFee: string;
    tokens: {
      address: string;
      symbol: string;
      name: string;
      decimals: string;
      weight: string;
      balance: string;
    }[];
    weightedParams: {
      id: string;
    };
  }[];
}

interface BalancerStablePoolsResponse {
  pools: {
    id: string;
    address: string;
    name: string;
    symbol: string;
    poolType: string;
    totalLiquidity: string;
    totalSwapVolume: string;
    totalSwapFee: string;
    swapFee: string;
    tokens: {
      address: string;
      symbol: string;
      name: string;
      decimals: string;
      balance: string;
    }[];
    stableParams: {
      id: string;
      amp: string;
    };
  }[];
}

// Use the endpoint from GRAPH_CONFIG
const BALANCER_ENDPOINT = GRAPH_CONFIG.ENDPOINTS.balancer;

/**
 * Fetches top pools from Balancer and transforms them into strategies
 */
export async function getBalancerStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<BalancerPoolsResponse>(
      BALANCER_ENDPOINT,
      BALANCER_POOLS_QUERY
    );

    if (!data.pools || !data.pools.length) {
      return [];
    }

    return data.pools.map((pool): Strategy => {
      const inputTokens = pool.tokens.map(t => t.symbol);
      const asset = inputTokens.join('/');
      const tvl = Number.parseFloat(pool.totalLiquidity || '0');
      const volume = Number.parseFloat(pool.totalSwapVolume || '0');
      const fees = Number.parseFloat(pool.totalSwapFee || '0');

      // Calculate APY based on fees and liquidity
      const feePercent = Number.parseFloat(pool.swapFee) * 100;
      const estimatedYearlyFees = (fees / volume) * volume * 365; // Simplified - in real implementation you'd use historical data
      const apy = tvl > 0 ? (estimatedYearlyFees / tvl) * 100 : 0;

      return {
        id: `balancer-${pool.id}`,
        name: pool.name || `Balancer ${asset} Pool`,
        protocol: 'Balancer',
        asset,
        type: getStrategyType('Balancer', asset),
        description: `Provide liquidity for ${asset} on Balancer ${pool.poolType} pool to earn trading fees`,
        apy: `${apy.toFixed(2)}%`,
        riskLevel: getRiskLevel(apy, {
          isStablecoin: inputTokens.every(t => ['USDC', 'USDT', 'DAI'].includes(t)),
          impermanentLossRisk: pool.poolType.includes('Stable') ? 'low' : 'medium'
        }),
        tvl: formatTVL(tvl),
        link: getProjectUrl('Balancer'),
        network: 'gnosis',
        tags: [
          'dex',
          'liquidity-providing',
          pool.poolType.toLowerCase(),
          ...inputTokens,
          volume > 100000 ? 'high-volume' : 'low-volume'
        ],
        minInvestment: '0.01 ETH equivalent',
        lastUpdated: new Date().toISOString(),
        totalVolume24h: formatTVL(volume / 365), // Rough estimate for 24h
        feesEarned24h: formatTVL(fees / 365)  // Rough estimate for 24h
      };
    });
  } catch (error) {
    console.error('Error fetching Balancer pools:', error);
    return [];
  }
}

/**
 * Gets a specific pool from Balancer
 */
export async function getBalancerPool(poolId: string) {
  try {
    const data = await fetchGraph<BalancerPoolResponse>(
      BALANCER_ENDPOINT,
      BALANCER_POOL_QUERY,
      { id: poolId }
    );

    if (!data.pool) {
      return null;
    }

    return {
      id: data.pool.id,
      address: data.pool.address,
      name: data.pool.name,
      symbol: data.pool.symbol,
      type: data.pool.poolType,
      liquidity: Number.parseFloat(data.pool.totalLiquidity || '0'),
      volume: Number.parseFloat(data.pool.totalSwapVolume || '0'),
      fees: Number.parseFloat(data.pool.totalSwapFee || '0'),
      feePercent: Number.parseFloat(data.pool.swapFee) * 100,
      tokens: data.pool.tokens.map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: Number.parseInt(token.decimals),
        weight: token.weight ? Number.parseFloat(token.weight) : null,
        balance: Number.parseFloat(token.balance)
      }))
    };
  } catch (error) {
    console.error('Error fetching Balancer pool:', error);
    return null;
  }
}

/**
 * Gets Balancer factories information
 */
export async function getBalancerFactories() {
  try {
    const data = await fetchGraph<BalancerFactoriesResponse>(
      BALANCER_ENDPOINT,
      BALANCER_FACTORIES_QUERY
    );

    if (!data.factories || !data.factories.length) {
      return [];
    }

    return data.factories.map(factory => ({
      id: factory.id,
      poolCount: Number.parseInt(factory.poolCount),
      totalLiquidity: Number.parseFloat(factory.totalLiquidity)
    }));
  } catch (error) {
    console.error('Error fetching Balancer factories:', error);
    return [];
  }
}

/**
 * Gets weighted pools from Balancer
 */
export async function getBalancerWeightedPools() {
  try {
    const data = await fetchGraph<BalancerWeightedPoolsResponse>(
      BALANCER_ENDPOINT,
      BALANCER_WEIGHTED_POOLS_QUERY
    );

    if (!data.pools || !data.pools.length) {
      return [];
    }

    return data.pools.map(pool => ({
      id: pool.id,
      address: pool.address,
      name: pool.name,
      symbol: pool.symbol,
      type: pool.poolType,
      liquidity: Number.parseFloat(pool.totalLiquidity || '0'),
      volume: Number.parseFloat(pool.totalSwapVolume || '0'),
      fees: Number.parseFloat(pool.totalSwapFee || '0'),
      feePercent: Number.parseFloat(pool.swapFee) * 100,
      tokens: pool.tokens.map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: Number.parseInt(token.decimals),
        weight: Number.parseFloat(token.weight || '0'),
        balance: Number.parseFloat(token.balance)
      }))
    }));
  } catch (error) {
    console.error('Error fetching Balancer weighted pools:', error);
    return [];
  }
}

/**
 * Gets stable pools from Balancer
 */
export async function getBalancerStablePools() {
  try {
    const data = await fetchGraph<BalancerStablePoolsResponse>(
      BALANCER_ENDPOINT,
      BALANCER_STABLE_POOLS_QUERY
    );

    if (!data.pools || !data.pools.length) {
      return [];
    }

    return data.pools.map(pool => ({
      id: pool.id,
      address: pool.address,
      name: pool.name,
      symbol: pool.symbol,
      type: pool.poolType,
      liquidity: Number.parseFloat(pool.totalLiquidity || '0'),
      volume: Number.parseFloat(pool.totalSwapVolume || '0'),
      fees: Number.parseFloat(pool.totalSwapFee || '0'),
      feePercent: Number.parseFloat(pool.swapFee) * 100,
      amp: Number.parseInt(pool.stableParams?.amp || '0'),
      tokens: pool.tokens.map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: Number.parseInt(token.decimals),
        balance: Number.parseFloat(token.balance)
      }))
    }));
  } catch (error) {
    console.error('Error fetching Balancer stable pools:', error);
    return [];
  }
}
