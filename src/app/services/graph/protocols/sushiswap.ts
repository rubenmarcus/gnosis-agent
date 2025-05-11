import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl, getStrategyType } from '../utils';

// Query for top tokens on Sushiswap
const SUSHISWAP_TOKENS_QUERY = `
  query getTopTokens {
    tokens(first: 50, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      symbol
      decimals
      totalValueLockedUSD
    }
  }
`;

// Query for reward tokens
const SUSHISWAP_REWARD_TOKENS_QUERY = `
  query getRewardTokens {
    rewardTokens(first: 20) {
      id
      token {
        id
        name
        symbol
        decimals
      }
      type
    }
  }
`;

// Query for top liquidity pools
const SUSHISWAP_POOLS_QUERY = `
  query getTopLiquidityPools {
    liquidityPools(
      first: 20,
      orderBy: totalValueLockedUSD,
      orderDirection: desc
    ) {
      id
      name
      inputTokens {
        id
        name
        symbol
        decimals
      }
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeTotalRevenueUSD
      dailyVolumeUSD
      dailyTotalRevenueUSD
    }
  }
`;

// Query for pool historical data
const SUSHISWAP_POOL_HISTORICAL_QUERY = `
  query getPoolHistoricalData($poolId: ID!) {
    liquidityPoolDailySnapshots(
      first: 30,
      orderBy: timestamp,
      orderDirection: desc,
      where: { pool: $poolId }
    ) {
      id
      timestamp
      totalValueLockedUSD
      dailyVolumeUSD
      dailyTotalRevenueUSD
    }
  }
`;

// Query for protocol metrics
const SUSHISWAP_PROTOCOL_METRICS_QUERY = `
  query getProtocolMetrics {
    dexAmmProtocols(first: 1) {
      id
      name
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeTotalRevenueUSD
    }
    financialsDailySnapshots(
      first: 30,
      orderBy: timestamp,
      orderDirection: desc
    ) {
      id
      timestamp
      totalValueLockedUSD
      dailyVolumeUSD
      dailyTotalRevenueUSD
    }
  }
`;

// Interfaces for Sushiswap response types
interface SushiswapTokensResponse {
  tokens: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
    totalValueLockedUSD: string;
  }[];
}

interface SushiswapRewardTokensResponse {
  rewardTokens: {
    id: string;
    token: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    type: string;
  }[];
}

interface SushiswapPoolsResponse {
  liquidityPools: {
    id: string;
    name: string;
    inputTokens: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    }[];
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeTotalRevenueUSD: string;
    dailyVolumeUSD: string;
    dailyTotalRevenueUSD: string;
  }[];
}

interface SushiswapPoolHistoricalResponse {
  liquidityPoolDailySnapshots: {
    id: string;
    timestamp: string;
    totalValueLockedUSD: string;
    dailyVolumeUSD: string;
    dailyTotalRevenueUSD: string;
  }[];
}

interface SushiswapProtocolMetricsResponse {
  dexAmmProtocols: {
    id: string;
    name: string;
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeTotalRevenueUSD: string;
  }[];
  financialsDailySnapshots: {
    id: string;
    timestamp: string;
    totalValueLockedUSD: string;
    dailyVolumeUSD: string;
    dailyTotalRevenueUSD: string;
  }[];
}

// Use the endpoint from GRAPH_CONFIG
const SUSHISWAP_ENDPOINT = GRAPH_CONFIG.ENDPOINTS.sushiswap;

/**
 * Fetches top liquidity pools from Sushiswap and transforms them into strategies
 */
export async function getSushiswapStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<SushiswapPoolsResponse>(
      SUSHISWAP_ENDPOINT,
      SUSHISWAP_POOLS_QUERY
    );

    if (!data.liquidityPools || !data.liquidityPools.length) {
      return [];
    }

    return Promise.all(
      data.liquidityPools.map(async (pool): Promise<Strategy> => {
        const inputTokens = pool.inputTokens.map(t => t.symbol);
        const asset = inputTokens.join('/');
        const tvl = Number.parseFloat(pool.totalValueLockedUSD || '0');
        const dailyVolume = Number.parseFloat(pool.dailyVolumeUSD || '0');
        const dailyRevenue = Number.parseFloat(pool.dailyTotalRevenueUSD || '0');

        // Get historical data for APY calculation
        const historicalData = await getPoolHistoricalPerformance(pool.id);
        const apy = calculateAPY(historicalData, tvl);

        return {
          id: `sushiswap-${pool.id}`,
          name: pool.name || `Sushiswap ${asset} Pool`,
          protocol: 'Sushiswap',
          asset,
          type: getStrategyType('Sushiswap', asset),
          description: `Provide liquidity for ${asset} on Sushiswap to earn trading fees`,
          apy: `${apy.toFixed(2)}%`,
          riskLevel: getRiskLevel(apy, {
            isStablecoin: inputTokens.every(t => ['USDC', 'USDT', 'DAI'].includes(t)),
            impermanentLossRisk: 'medium'
          }),
          tvl: formatTVL(tvl),
          link: getProjectUrl('Sushiswap'),
          network: 'gnosis',
          tags: [
            'dex',
            'liquidity-providing',
            ...inputTokens,
            dailyVolume > 100000 ? 'high-volume' : 'low-volume'
          ],
          minInvestment: '0.01 ETH equivalent',
          lastUpdated: new Date().toISOString(),
          totalVolume24h: formatTVL(dailyVolume),
          feesEarned24h: formatTVL(dailyRevenue)
        };
      })
    );
  } catch (error) {
    console.error('Error fetching Sushiswap pools:', error);
    return [];
  }
}

/**
 * Gets top tokens from Sushiswap
 */
export async function getSushiswapTopTokens() {
  try {
    const data = await fetchGraph<SushiswapTokensResponse>(
      SUSHISWAP_ENDPOINT,
      SUSHISWAP_TOKENS_QUERY
    );

    if (!data.tokens || !data.tokens.length) {
      return [];
    }

    return data.tokens.map(token => ({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      decimals: Number.parseInt(token.decimals),
      tvl: Number.parseFloat(token.totalValueLockedUSD)
    }));
  } catch (error) {
    console.error('Error fetching Sushiswap tokens:', error);
    return [];
  }
}

/**
 * Gets reward tokens from Sushiswap
 */
export async function getSushiswapRewardTokens() {
  try {
    const data = await fetchGraph<SushiswapRewardTokensResponse>(
      SUSHISWAP_ENDPOINT,
      SUSHISWAP_REWARD_TOKENS_QUERY
    );

    if (!data.rewardTokens || !data.rewardTokens.length) {
      return [];
    }

    return data.rewardTokens.map(rewardToken => ({
      id: rewardToken.id,
      tokenId: rewardToken.token.id,
      tokenSymbol: rewardToken.token.symbol,
      tokenName: rewardToken.token.name,
      type: rewardToken.type
    }));
  } catch (error) {
    console.error('Error fetching Sushiswap reward tokens:', error);
    return [];
  }
}

/**
 * Gets historical performance data for a specific Sushiswap pool
 */
export async function getPoolHistoricalPerformance(poolId: string) {
  try {
    const data = await fetchGraph<SushiswapPoolHistoricalResponse>(
      SUSHISWAP_ENDPOINT,
      SUSHISWAP_POOL_HISTORICAL_QUERY,
      { poolId }
    );

    if (!data.liquidityPoolDailySnapshots || !data.liquidityPoolDailySnapshots.length) {
      return [];
    }

    return data.liquidityPoolDailySnapshots.map(day => ({
      date: new Date(Number.parseInt(day.timestamp, 10) * 1000).toISOString().split('T')[0],
      tvl: Number.parseFloat(day.totalValueLockedUSD),
      volume: Number.parseFloat(day.dailyVolumeUSD),
      revenue: Number.parseFloat(day.dailyTotalRevenueUSD),
    }));
  } catch (error) {
    console.error(`Error fetching Sushiswap pool performance for ${poolId}:`, error);
    return [];
  }
}

/**
 * Calculate APY based on historical data
 */
function calculateAPY(historicalData: Array<{ tvl: number; revenue: number }>, currentTvl: number) {
  if (!historicalData.length || currentTvl <= 0) {
    return 0;
  }

  // Calculate average daily revenue
  const avgDailyRevenue = historicalData.reduce(
    (sum, day) => sum + (day.revenue || 0),
    0
  ) / historicalData.length;

  // Annualize and convert to percentage
  return (avgDailyRevenue * 365 * 100) / currentTvl;
}

/**
 * Gets overall Sushiswap protocol metrics
 */
export async function getSushiswapProtocolMetrics() {
  try {
    const data = await fetchGraph<SushiswapProtocolMetricsResponse>(
      SUSHISWAP_ENDPOINT,
      SUSHISWAP_PROTOCOL_METRICS_QUERY
    );

    if (!data.dexAmmProtocols || !data.dexAmmProtocols.length) {
      return null;
    }

    const protocol = data.dexAmmProtocols[0];
    const snapshots = data.financialsDailySnapshots || [];

    return {
      name: protocol.name,
      tvl: formatTVL(Number.parseFloat(protocol.totalValueLockedUSD)),
      totalVolume: formatTVL(Number.parseFloat(protocol.cumulativeVolumeUSD)),
      totalRevenue: formatTVL(Number.parseFloat(protocol.cumulativeTotalRevenueUSD)),
      dailyMetrics: snapshots.map(day => ({
        date: new Date(Number.parseInt(day.timestamp, 10) * 1000).toISOString().split('T')[0],
        tvl: Number.parseFloat(day.totalValueLockedUSD),
        volume: Number.parseFloat(day.dailyVolumeUSD),
        revenue: Number.parseFloat(day.dailyTotalRevenueUSD)
      }))
    };
  } catch (error) {
    console.error('Error fetching Sushiswap protocol metrics:', error);
    return null;
  }
}
