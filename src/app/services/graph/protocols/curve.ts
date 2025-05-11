import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getStrategyType } from '../utils';

// Query for Curve liquidity pools
const CURVE_POOLS_QUERY = `
  query getLiquidityPools {
    liquidityPools(
      first: 20,
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
      outputToken {
        id
        name
        symbol
        decimals
      }
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeSupplySideRevenueUSD
      cumulativeProtocolSideRevenueUSD
      fees {
        id
        feePercentage
      }
    }
  }
`;

// Query for a specific liquidity pool
const CURVE_POOL_QUERY = `
  query getLiquidityPool($id: ID!) {
    liquidityPool(id: $id) {
      id
      name
      symbol
      inputTokens {
        id
        name
        symbol
        decimals
      }
      outputToken {
        id
        name
        symbol
        decimals
      }
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeSupplySideRevenueUSD
      cumulativeProtocolSideRevenueUSD
      fees {
        id
        feePercentage
      }
    }
  }
`;

// Query for Curve protocol stats
const CURVE_PROTOCOL_QUERY = `
  query getProtocolStats {
    dexAmmProtocols(first: 1) {
      id
      name
      totalValueLockedUSD
      cumulativeVolumeUSD
      cumulativeSupplySideRevenueUSD
      cumulativeProtocolSideRevenueUSD
    }
  }
`;

// Query for daily snapshots
const CURVE_DAILY_SNAPSHOTS_QUERY = `
  query getDailySnapshots($limit: Int = 30) {
    financialsDailySnapshots(
      first: $limit,
      orderBy: timestamp,
      orderDirection: desc
    ) {
      id
      timestamp
      totalValueLockedUSD
      dailyVolumeUSD
      dailySupplySideRevenueUSD
      dailyProtocolSideRevenueUSD
    }
  }
`;

// Query for daily pool snapshots
const CURVE_POOL_SNAPSHOTS_QUERY = `
  query getPoolSnapshots($poolId: ID!, $limit: Int = 30) {
    liquidityPoolDailySnapshots(
      first: $limit,
      where: { pool: $poolId },
      orderBy: timestamp,
      orderDirection: desc
    ) {
      id
      timestamp
      totalValueLockedUSD
      dailyVolumeUSD
      dailySupplySideRevenueUSD
      dailyProtocolSideRevenueUSD
    }
  }
`;

// Interfaces for Curve response types
interface CurvePoolsResponse {
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
    outputToken: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeSupplySideRevenueUSD: string;
    cumulativeProtocolSideRevenueUSD: string;
    fees: {
      id: string;
      feePercentage: string;
    }[];
  }[];
}

interface CurvePoolResponse {
  liquidityPool: {
    id: string;
    name: string;
    symbol: string;
    inputTokens: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    }[];
    outputToken: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeSupplySideRevenueUSD: string;
    cumulativeProtocolSideRevenueUSD: string;
    fees: {
      id: string;
      feePercentage: string;
    }[];
  };
}

interface CurveProtocolResponse {
  dexAmmProtocols: {
    id: string;
    name: string;
    totalValueLockedUSD: string;
    cumulativeVolumeUSD: string;
    cumulativeSupplySideRevenueUSD: string;
    cumulativeProtocolSideRevenueUSD: string;
  }[];
}

interface CurveDailySnapshotsResponse {
  financialsDailySnapshots: {
    id: string;
    timestamp: string;
    totalValueLockedUSD: string;
    dailyVolumeUSD: string;
    dailySupplySideRevenueUSD: string;
    dailyProtocolSideRevenueUSD: string;
  }[];
}

interface CurvePoolSnapshotsResponse {
  liquidityPoolDailySnapshots: {
    id: string;
    timestamp: string;
    totalValueLockedUSD: string;
    dailyVolumeUSD: string;
    dailySupplySideRevenueUSD: string;
    dailyProtocolSideRevenueUSD: string;
  }[];
}

// Add Curve endpoint to GRAPH_CONFIG (temporary solution for local development)
// In production, this should be added to the GRAPH_CONFIG in base.ts
const CURVE_ENDPOINT = process.env.CURVE_ENDPOINT || 'https://api.thegraph.com/subgraphs/name/messari/curve-finance';

/**
 * Fetches top liquidity pools from Curve and transforms them into strategies
 */
export async function getCurveStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<CurvePoolsResponse>(
      CURVE_ENDPOINT,
      CURVE_POOLS_QUERY
    );

    if (!data || !data.liquidityPools) {
      return [];
    }

    return data.liquidityPools.map((pool) => {
      const tvlValue = Number.parseFloat(pool.totalValueLockedUSD);
      const tvl = formatTVL(tvlValue);
      const inputTokensSymbols = pool.inputTokens.map((token) => token.symbol).join('/');
      const fee = pool.fees?.[0]?.feePercentage ? Number.parseFloat(pool.fees[0].feePercentage) : 0;

      return {
        id: pool.id,
        name: pool.name || `Curve ${inputTokensSymbols} Pool`,
        protocol: 'Curve',
        asset: inputTokensSymbols,
        type: getStrategyType('curve', inputTokensSymbols),
        description: `Curve ${inputTokensSymbols} liquidity pool`,
        apy: `${(fee * 100).toFixed(2)}%`,
        riskLevel: getRiskLevel(fee * 100, { isStableSwap: true }),
        tvl,
        link: 'https://curve.fi/pools',
        network: 'ethereum',
        tags: ['dex', 'amm', 'liquidity'],
        minInvestment: '0',
        totalVolume24h: formatTVL(Number.parseFloat(pool.cumulativeVolumeUSD)),
        feesEarned24h: formatTVL(Number.parseFloat(pool.cumulativeSupplySideRevenueUSD)),
        reserves: pool.inputTokens.map((token) => token.symbol)
      };
    });
  } catch (error) {
    console.error('Error fetching Curve strategies:', error);
    return [];
  }
}

/**
 * Fetches a specific Curve pool by id
 */
export async function getCurvePool(poolId: string) {
  try {
    const data = await fetchGraph<CurvePoolResponse>(
      CURVE_ENDPOINT,
      CURVE_POOL_QUERY,
      { id: poolId }
    );

    if (!data || !data.liquidityPool) {
      return null;
    }

    const pool = data.liquidityPool;
    const tvlValue = Number.parseFloat(pool.totalValueLockedUSD);
    const tvl = formatTVL(tvlValue);
    const inputTokensSymbols = pool.inputTokens.map((token) => token.symbol).join('/');
    const fee = pool.fees?.[0]?.feePercentage ? Number.parseFloat(pool.fees[0].feePercentage) : 0;

    return {
      id: pool.id,
      name: pool.name || `Curve ${inputTokensSymbols} Pool`,
      protocol: 'Curve',
      asset: inputTokensSymbols,
      type: getStrategyType('curve', inputTokensSymbols),
      description: `Curve ${inputTokensSymbols} liquidity pool`,
      apy: `${(fee * 100).toFixed(2)}%`,
      riskLevel: getRiskLevel(fee * 100, { isStableSwap: true }),
      tvl,
      link: `https://curve.fi/pools/${pool.id}`,
      network: 'ethereum',
      tags: ['dex', 'amm', 'liquidity'],
      minInvestment: '0',
      totalVolume24h: formatTVL(Number.parseFloat(pool.cumulativeVolumeUSD)),
      feesEarned24h: formatTVL(Number.parseFloat(pool.cumulativeSupplySideRevenueUSD)),
      reserves: pool.inputTokens.map((token) => token.symbol)
    };
  } catch (error) {
    console.error('Error fetching Curve pool:', error);
    return null;
  }
}

/**
 * Fetches Curve protocol stats
 */
export async function getCurveProtocolStats() {
  try {
    const data = await fetchGraph<CurveProtocolResponse>(
      CURVE_ENDPOINT,
      CURVE_PROTOCOL_QUERY
    );

    if (!data || !data.dexAmmProtocols || data.dexAmmProtocols.length === 0) {
      return null;
    }

    const protocol = data.dexAmmProtocols[0];

    return {
      id: protocol.id,
      name: protocol.name || 'Curve',
      tvl: formatTVL(Number.parseFloat(protocol.totalValueLockedUSD)),
      volume: formatTVL(Number.parseFloat(protocol.cumulativeVolumeUSD)),
      supplySideRevenue: formatTVL(Number.parseFloat(protocol.cumulativeSupplySideRevenueUSD)),
      protocolRevenue: formatTVL(Number.parseFloat(protocol.cumulativeProtocolSideRevenueUSD))
    };
  } catch (error) {
    console.error('Error fetching Curve protocol stats:', error);
    return null;
  }
}

/**
 * Fetches Curve daily financial snapshots
 */
export async function getCurveDailySnapshots(limit = 30) {
  try {
    const data = await fetchGraph<CurveDailySnapshotsResponse>(
      CURVE_ENDPOINT,
      CURVE_DAILY_SNAPSHOTS_QUERY,
      { limit }
    );

    if (!data || !data.financialsDailySnapshots) {
      return [];
    }

    return data.financialsDailySnapshots.map((snapshot) => ({
      id: snapshot.id,
      timestamp: Number(snapshot.timestamp),
      tvl: formatTVL(Number.parseFloat(snapshot.totalValueLockedUSD)),
      volume: formatTVL(Number.parseFloat(snapshot.dailyVolumeUSD)),
      supplySideRevenue: formatTVL(Number.parseFloat(snapshot.dailySupplySideRevenueUSD)),
      protocolRevenue: formatTVL(Number.parseFloat(snapshot.dailyProtocolSideRevenueUSD))
    }));
  } catch (error) {
    console.error('Error fetching Curve daily snapshots:', error);
    return [];
  }
}

/**
 * Fetches daily snapshots for a specific Curve pool
 */
export async function getCurvePoolSnapshots(poolId: string, limit = 30) {
  try {
    const data = await fetchGraph<CurvePoolSnapshotsResponse>(
      CURVE_ENDPOINT,
      CURVE_POOL_SNAPSHOTS_QUERY,
      { poolId, limit }
    );

    if (!data || !data.liquidityPoolDailySnapshots) {
      return [];
    }

    return data.liquidityPoolDailySnapshots.map((snapshot) => ({
      id: snapshot.id,
      timestamp: Number(snapshot.timestamp),
      tvl: formatTVL(Number.parseFloat(snapshot.totalValueLockedUSD)),
      volume: formatTVL(Number.parseFloat(snapshot.dailyVolumeUSD)),
      supplySideRevenue: formatTVL(Number.parseFloat(snapshot.dailySupplySideRevenueUSD)),
      protocolRevenue: formatTVL(Number.parseFloat(snapshot.dailyProtocolSideRevenueUSD))
    }));
  } catch (error) {
    console.error('Error fetching Curve pool snapshots:', error);
    return [];
  }
}
