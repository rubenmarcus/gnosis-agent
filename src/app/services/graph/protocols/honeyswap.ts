import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl } from '../utils';

// Query for top liquidity pools with comprehensive data
const HONEYSWAP_POOLS_QUERY = `
  query getTopLiquidityPools {
    liquidityPools(
      first: 10,
      orderBy: totalValueLockedUSD,
      orderDirection: desc
    ) {
      id
      name
      symbol
      inputTokens {
        id
        name
        symbol
        decimals
      }
      fees {
        feeType
        feePercentage
      }
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeSupplySideRevenueUSD
      cumulativeProtocolSideRevenueUSD
      cumulativeTotalRevenueUSD
      dailyVolumeUSD
      dailySupplySideRevenueUSD
      dailyProtocolSideRevenueUSD
      dailyTotalRevenueUSD
    }
  }
`;

// Query for staking pools information (MasterChef)
const HONEYSWAP_STAKING_QUERY = `
  query getStakingPools {
    masterChefStakingPools(
      first: 10,
      orderBy: stakedOutputTokenAmount,
      orderDirection: desc
    ) {
      id
      poolId
      pair {
        id
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
      rewarder {
        id
        rewardTokens {
          token {
            symbol
          }
          tokenPerBlock
        }
      }
      allocPoint
      lastRewardBlock
      accSushiPerShare
      slpBalance
      totalStaked
    }
  }
`;

// Query for historical data to calculate APY
const HONEYSWAP_POOL_HISTORICAL_QUERY = `
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
      dailySupplySideRevenueUSD
      dailyProtocolSideRevenueUSD
      dailyTotalRevenueUSD
    }
  }
`;

// Query for protocol overview metrics
const HONEYSWAP_PROTOCOL_METRICS_QUERY = `
  query getProtocolMetrics {
    dexAmmProtocols(first: 1) {
      id
      name
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeSupplySideRevenueUSD
      cumulativeProtocolSideRevenueUSD
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
      dailySupplySideRevenueUSD
      dailyProtocolSideRevenueUSD
      dailyTotalRevenueUSD
    }
  }
`;

// Comprehensive interface for Honeyswap response types
interface HoneyswapPoolsResponse {
  liquidityPools: {
    id: string;
    name: string;
    symbol: string;
    inputTokens: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    }[];
    fees: {
      feeType: string;
      feePercentage: string;
    }[];
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeSupplySideRevenueUSD: string;
    cumulativeProtocolSideRevenueUSD: string;
    cumulativeTotalRevenueUSD: string;
    dailyVolumeUSD: string;
    dailySupplySideRevenueUSD: string;
    dailyProtocolSideRevenueUSD: string;
    dailyTotalRevenueUSD: string;
  }[];
}

interface HoneyswapStakingResponse {
  masterChefStakingPools: {
    id: string;
    poolId: string;
    pair: {
      id: string;
      token0: {
        symbol: string;
      };
      token1: {
        symbol: string;
      };
    };
    rewarder: {
      id: string;
      rewardTokens: {
        token: {
          symbol: string;
        };
        tokenPerBlock: string;
      }[];
    };
    allocPoint: string;
    lastRewardBlock: string;
    accSushiPerShare: string;
    slpBalance: string;
    totalStaked: string;
  }[];
}

interface HoneyswapPoolHistoricalResponse {
  liquidityPoolDailySnapshots: {
    id: string;
    timestamp: string;
    totalValueLockedUSD: string;
    dailyVolumeUSD: string;
    dailySupplySideRevenueUSD: string;
    dailyProtocolSideRevenueUSD: string;
    dailyTotalRevenueUSD: string;
  }[];
}

interface HoneyswapProtocolMetricsResponse {
  dexAmmProtocols: {
    id: string;
    name: string;
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeSupplySideRevenueUSD: string;
    cumulativeProtocolSideRevenueUSD: string;
    cumulativeTotalRevenueUSD: string;
  }[];
  financialsDailySnapshots: {
    id: string;
    timestamp: string;
    totalValueLockedUSD: string;
    dailyVolumeUSD: string;
    dailySupplySideRevenueUSD: string;
    dailyProtocolSideRevenueUSD: string;
    dailyTotalRevenueUSD: string;
  }[];
}

// Configuration for the new subgraph
const HONEYSWAP_SUBGRAPH_ID = '33aQTj7abtAR5zGcG9JBd1fd1sodgKDjoTsKuA8QrUW7';
const HONEYSWAP_SUBGRAPH_URL = `https://api.thegraph.com/subgraphs/id/${HONEYSWAP_SUBGRAPH_ID}`;

/**
 * Fetches top liquidity pools from Honeyswap and transforms them into strategies
 * Using the comprehensive subgraph data
 */
export async function getHoneyswapStrategies(): Promise<Strategy[]> {
  try {
    // Get pool data from the new subgraph
    const poolsData = await fetchGraph<HoneyswapPoolsResponse>(
      HONEYSWAP_SUBGRAPH_URL,
      HONEYSWAP_POOLS_QUERY
    );

    if (!poolsData.liquidityPools || !poolsData.liquidityPools.length) {
      return [];
    }

    // Transform the data into strategy objects
    return poolsData.liquidityPools.map((pool): Strategy => {
      // Extract token symbols for display
      const tokens = pool.inputTokens.map(token => token.symbol);
      const asset = tokens.join('-');

      // Parse numeric values
      const tvl = Number.parseFloat(pool.totalValueLockedUSD || '0');
      const dailyVolume = Number.parseFloat(pool.dailyVolumeUSD || '0');
      const dailyRevenueUSD = Number.parseFloat(pool.dailyTotalRevenueUSD || '0');

      // Calculate APY based on daily revenue * 365 / TVL
      const estimatedApy = tvl > 0 ? (dailyRevenueUSD * 365 * 100) / tvl : 0;

      // Check if pool contains stablecoins
      const isStablecoinPair = tokens.some(symbol =>
        ['USDC', 'USDT', 'DAI', 'XDAI', 'WXDAI'].includes(symbol)
      );

      // Determine impermanent loss risk
      const impermanentLossRisk = isStablecoinPair ? 'low' : 'medium';

      return {
        id: `honeyswap-${pool.id}`,
        name: `Honeyswap ${asset} LP`,
        protocol: 'Honeyswap',
        asset,
        type: 'Liquidity Providing',
        description: `Provide liquidity for ${asset} pair on Honeyswap`,
        apy: `${estimatedApy.toFixed(2)}%`,
        riskLevel: getRiskLevel(estimatedApy, {
          isStablecoin: isStablecoinPair,
          impermanentLossRisk
        }),
        tvl: formatTVL(tvl),
        link: getProjectUrl('Honeyswap'),
        network: 'gnosis',
        tags: ['amm', 'lp', isStablecoinPair ? 'stablecoin' : 'volatile', `pool-${pool.id}`],
        minInvestment: '10 xDAI equivalent',
        lastUpdated: new Date().toISOString(),
        totalVolume24h: formatTVL(dailyVolume),
        feesEarned24h: formatTVL(dailyRevenueUSD),
      };
    });
  } catch (error) {
    console.error('Error fetching Honeyswap pools:', error);
    return [];
  }
}

/**
 * Fetches staking opportunities from Honeyswap MasterChef
 */
export async function getHoneyswapStakingOpportunities() {
  try {
    const stakingData = await fetchGraph<HoneyswapStakingResponse>(
      HONEYSWAP_SUBGRAPH_URL,
      HONEYSWAP_STAKING_QUERY
    );

    if (!stakingData.masterChefStakingPools || !stakingData.masterChefStakingPools.length) {
      return [];
    }

    return stakingData.masterChefStakingPools.map(pool => {
      const pairSymbol = `${pool.pair.token0.symbol}-${pool.pair.token1.symbol}`;
      const rewardTokens = pool.rewarder?.rewardTokens.map(rt => rt.token.symbol) || ['HONEY'];

      return {
        id: pool.id,
        poolId: pool.poolId,
        pairName: pairSymbol,
        pairAddress: pool.pair.id,
        rewardTokens,
        allocPoint: pool.allocPoint,
        totalStaked: pool.totalStaked,
        // Additional data as needed
      };
    });
  } catch (error) {
    console.error('Error fetching Honeyswap staking opportunities:', error);
    return [];
  }
}

/**
 * Fetches historical performance data for a specific pool
 * Useful for calculating more accurate APY based on longer timeframes
 */
export async function getPoolHistoricalPerformance(poolId: string) {
  try {
    const historicalData = await fetchGraph<HoneyswapPoolHistoricalResponse>(
      HONEYSWAP_SUBGRAPH_URL,
      HONEYSWAP_POOL_HISTORICAL_QUERY,
      { poolId }
    );

    return historicalData.liquidityPoolDailySnapshots.map(snapshot => ({
      timestamp: new Date(Number.parseInt(snapshot.timestamp) * 1000),
      tvl: Number(snapshot.totalValueLockedUSD),
      volume: Number(snapshot.dailyVolumeUSD),
      revenue: Number(snapshot.dailyTotalRevenueUSD),
      supplySideRevenue: Number(snapshot.dailySupplySideRevenueUSD),
      protocolSideRevenue: Number(snapshot.dailyProtocolSideRevenueUSD)
    }));
  } catch (error) {
    console.error(`Error fetching historical data for pool ${poolId}:`, error);
    return [];
  }
}

/**
 * Calculates more accurate APY for a pool based on historical data
 */
export async function calculateHistoricalAPY(poolId: string, days = 30) {
  try {
    const historicalData = await getPoolHistoricalPerformance(poolId);

    if (historicalData.length === 0) {
      return null;
    }

    // Calculate average TVL and daily revenue over the period
    let totalTVL = 0;
    let totalRevenue = 0;
    const validSnapshots = historicalData.filter(day => day.tvl > 0);

    if (validSnapshots.length === 0) {
      return null;
    }

    for (const day of validSnapshots) {
      totalTVL += day.tvl;
      totalRevenue += day.revenue;
    }

    const avgTVL = totalTVL / validSnapshots.length;
    const avgDailyRevenue = totalRevenue / validSnapshots.length;

    // Calculate annualized return
    const annualizedAPY = (avgDailyRevenue * 365 * 100) / avgTVL;

    return {
      apy: annualizedAPY,
      avgDailyRevenue,
      avgTVL,
      daysAnalyzed: validSnapshots.length
    };
  } catch (error) {
    console.error(`Error calculating historical APY for pool ${poolId}:`, error);
    return null;
  }
}

/**
 * Fetches overall protocol metrics for Honeyswap
 */
export async function getHoneyswapProtocolMetrics() {
  try {
    const metricsData = await fetchGraph<HoneyswapProtocolMetricsResponse>(
      HONEYSWAP_SUBGRAPH_URL,
      HONEYSWAP_PROTOCOL_METRICS_QUERY
    );

    if (!metricsData.dexAmmProtocols || metricsData.dexAmmProtocols.length === 0) {
      return null;
    }

    const protocol = metricsData.dexAmmProtocols[0];
    const dailySnapshots = metricsData.financialsDailySnapshots;

    return {
      name: protocol.name,
      totalValueLockedUSD: Number(protocol.totalValueLockedUSD),
      cumulativeVolumeUSD: Number(protocol.cumulativeVolumeUSD),
      cumulativeRevenueUSD: Number(protocol.cumulativeTotalRevenueUSD),
      dailySnapshots: dailySnapshots.map(snapshot => ({
        timestamp: new Date(Number.parseInt(snapshot.timestamp) * 1000),
        tvl: Number(snapshot.totalValueLockedUSD),
        volume: Number(snapshot.dailyVolumeUSD),
        revenue: Number(snapshot.dailyTotalRevenueUSD)
      }))
    };
  } catch (error) {
    console.error('Error fetching Honeyswap protocol metrics:', error);
    return null;
  }
}