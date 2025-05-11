import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getStrategyType } from '../utils';

// Basic query for pools
const RMM_POOLS_QUERY = `
  query getLiquidityPools {
    pools(
      first: 100,
      orderBy: id,
      orderDirection: desc
    ) {
      id
      name
      symbol
      protocol {
        id
        name
      }
      totalValueLockedUSD
      priceOracleAsset {
        id
        priceInEth
        priceSource
      }
      reserves {
        id
        name
        symbol
        decimals
      }
    }
  }
`;

// Query for a specific pool
const RMM_POOL_QUERY = `
  query getPool($id: ID!) {
    pool(id: $id) {
      id
      name
      symbol
      protocol {
        id
        name
      }
      totalValueLockedUSD
      priceOracleAsset {
        id
        priceInEth
        priceSource
      }
      reserves {
        id
        name
        symbol
        decimals
      }
    }
  }
`;

// Query for RMM protocol stats
const RMM_PROTOCOL_QUERY = `
  query getProtocolStats {
    protocols(first: 1) {
      id
      name
      totalValueLockedUSD
      totalPoolCount
    }
  }
`;

// Query for user reserves
const RMM_USER_RESERVES_QUERY = `
  query getUserReserves($userAddress: ID!) {
    userReserves(
      where: { user: $userAddress },
      orderBy: currentATokenBalance,
      orderDirection: desc,
      first: 100
    ) {
      id
      currentATokenBalance
      currentStableDebt
      currentVariableDebt
      reserve {
        id
        name
        symbol
        decimals
        pool {
          id
          name
        }
        price {
          priceInEth
        }
      }
    }
  }
`;

// Query for reserve data
const RMM_RESERVES_QUERY = `
  query getReserves {
    reserves(
      first: 100,
      orderBy: totalValueLockedUSD,
      orderDirection: desc
    ) {
      id
      name
      symbol
      decimals
      totalValueLockedUSD
      utilizationRate
      borrowingEnabled
      isActive
      isFrozen
      availableLiquidity
      totalDeposits
      totalBorrows
      price {
        priceInEth
        priceSource
      }
    }
  }
`;

// Interfaces for RMM response types
interface RmmPoolsResponse {
  pools: {
    id: string;
    name: string;
    symbol: string;
    protocol: {
      id: string;
      name: string;
    };
    totalValueLockedUSD: string;
    priceOracleAsset: {
      id: string;
      priceInEth: string;
      priceSource: string;
    };
    reserves: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    }[];
  }[];
}

interface RmmPoolResponse {
  pool: {
    id: string;
    name: string;
    symbol: string;
    protocol: {
      id: string;
      name: string;
    };
    totalValueLockedUSD: string;
    priceOracleAsset: {
      id: string;
      priceInEth: string;
      priceSource: string;
    };
    reserves: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    }[];
  };
}

interface RmmProtocolResponse {
  protocols: {
    id: string;
    name: string;
    totalValueLockedUSD: string;
    totalPoolCount: string;
  }[];
}

interface RmmUserReservesResponse {
  userReserves: {
    id: string;
    currentATokenBalance: string;
    currentStableDebt: string;
    currentVariableDebt: string;
    reserve: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
      pool: {
        id: string;
        name: string;
      };
      price: {
        priceInEth: string;
      };
    };
  }[];
}

interface RmmReservesResponse {
  reserves: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
    totalValueLockedUSD: string;
    utilizationRate: string;
    borrowingEnabled: boolean;
    isActive: boolean;
    isFrozen: boolean;
    availableLiquidity: string;
    totalDeposits: string;
    totalBorrows: string;
    price: {
      priceInEth: string;
      priceSource: string;
    };
  }[];
}

/**
 * Fetches pools from RMM and transforms them into strategies
 */
export async function getRmmStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<RmmPoolsResponse>(
      GRAPH_CONFIG.ENDPOINTS.rmm,
      RMM_POOLS_QUERY
    );

    if (!data || !data.pools) {
      return [];
    }

    return data.pools.map((pool) => {
      const tvlValue = Number.parseFloat(pool.totalValueLockedUSD || '0');
      const tvl = formatTVL(tvlValue);
      const reserveSymbols = pool.reserves.map((reserve) => reserve.symbol).join('/');

      return {
        id: pool.id,
        name: pool.name || `RMM ${reserveSymbols} Pool`,
        protocol: pool.protocol?.name || 'RMM',
        asset: reserveSymbols,
        type: getStrategyType('rmm', reserveSymbols),
        description: `RMM ${reserveSymbols} liquidity pool`,
        apy: 'Variable', // This would need to be calculated from actual data
        riskLevel: getRiskLevel(0), // Adjust risk level calculation based on available options
        tvl,
        link: `https://app.rmm.finance/pools/${pool.id}`,
        network: 'gnosis', // Assuming this is on Gnosis Chain
        tags: ['lending', 'liquidity', 'defi'],
        minInvestment: '0',
        reserves: pool.reserves.map(reserve => reserve.symbol)
      };
    });
  } catch (error) {
    console.error('Error fetching RMM strategies:', error);
    return [];
  }
}

/**
 * Fetches a specific pool from RMM by ID
 */
export async function getRmmPool(poolId: string) {
  try {
    const data = await fetchGraph<RmmPoolResponse>(
      GRAPH_CONFIG.ENDPOINTS.rmm,
      RMM_POOL_QUERY,
      { id: poolId }
    );

    if (!data || !data.pool) {
      return null;
    }

    const pool = data.pool;
    const tvlValue = Number.parseFloat(pool.totalValueLockedUSD || '0');
    const tvl = formatTVL(tvlValue);
    const reserveSymbols = pool.reserves.map((reserve) => reserve.symbol).join('/');

    return {
      id: pool.id,
      name: pool.name || `RMM ${reserveSymbols} Pool`,
      protocol: pool.protocol?.name || 'RMM',
      asset: reserveSymbols,
      type: getStrategyType('rmm', reserveSymbols),
      description: `RMM ${reserveSymbols} liquidity pool`,
      apy: 'Variable', // This would need to be calculated from actual data
      riskLevel: getRiskLevel(0), // Adjust risk level calculation based on available options
      tvl,
      link: `https://app.rmm.finance/pools/${pool.id}`,
      network: 'gnosis', // Assuming this is on Gnosis Chain
      tags: ['lending', 'liquidity', 'defi'],
      minInvestment: '0',
      reserves: pool.reserves.map(reserve => reserve.symbol)
    };
  } catch (error) {
    console.error('Error fetching RMM pool:', error);
    return null;
  }
}

/**
 * Fetches protocol stats from RMM
 */
export async function getRmmProtocolStats() {
  try {
    const data = await fetchGraph<RmmProtocolResponse>(
      GRAPH_CONFIG.ENDPOINTS.rmm,
      RMM_PROTOCOL_QUERY
    );

    if (!data || !data.protocols || data.protocols.length === 0) {
      return null;
    }

    const protocol = data.protocols[0];
    const tvlValue = Number.parseFloat(protocol.totalValueLockedUSD || '0');

    return {
      id: protocol.id,
      name: protocol.name,
      tvl: formatTVL(tvlValue),
      poolCount: Number.parseInt(protocol.totalPoolCount, 10),
    };
  } catch (error) {
    console.error('Error fetching RMM protocol stats:', error);
    return null;
  }
}

/**
 * Fetches user reserves from RMM
 */
export async function getRmmUserReserves(userAddress: string) {
  try {
    const data = await fetchGraph<RmmUserReservesResponse>(
      GRAPH_CONFIG.ENDPOINTS.rmm,
      RMM_USER_RESERVES_QUERY,
      { userAddress }
    );

    if (!data || !data.userReserves) {
      return [];
    }

    return data.userReserves.map((userReserve) => {
      const balance = Number.parseFloat(userReserve.currentATokenBalance || '0');
      const stableDebt = Number.parseFloat(userReserve.currentStableDebt || '0');
      const variableDebt = Number.parseFloat(userReserve.currentVariableDebt || '0');
      const priceInEth = Number.parseFloat(userReserve.reserve.price?.priceInEth || '0');

      return {
        id: userReserve.id,
        reserve: {
          id: userReserve.reserve.id,
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          decimals: Number.parseInt(userReserve.reserve.decimals, 10),
          pool: userReserve.reserve.pool,
        },
        currentBalance: balance.toString(),
        currentBalanceUSD: (balance * priceInEth).toString(),
        currentStableDebt: stableDebt.toString(),
        currentVariableDebt: variableDebt.toString(),
        totalDebt: (stableDebt + variableDebt).toString(),
        totalDebtUSD: ((stableDebt + variableDebt) * priceInEth).toString(),
      };
    });
  } catch (error) {
    console.error('Error fetching RMM user reserves:', error);
    return [];
  }
}

/**
 * Fetches reserves data from RMM
 */
export async function getRmmReserves() {
  try {
    const data = await fetchGraph<RmmReservesResponse>(
      GRAPH_CONFIG.ENDPOINTS.rmm,
      RMM_RESERVES_QUERY
    );

    if (!data || !data.reserves) {
      return [];
    }

    return data.reserves.map((reserve) => {
      const tvlValue = Number.parseFloat(reserve.totalValueLockedUSD || '0');
      const utilizationRate = Number.parseFloat(reserve.utilizationRate || '0') * 100;

      return {
        id: reserve.id,
        name: reserve.name,
        symbol: reserve.symbol,
        decimals: Number.parseInt(reserve.decimals, 10),
        tvl: formatTVL(tvlValue),
        utilizationRate: `${utilizationRate.toFixed(2)}%`,
        borrowingEnabled: reserve.borrowingEnabled,
        isActive: reserve.isActive,
        isFrozen: reserve.isFrozen,
        availableLiquidity: reserve.availableLiquidity,
        totalDeposits: reserve.totalDeposits,
        totalBorrows: reserve.totalBorrows,
        priceInEth: reserve.price?.priceInEth,
        priceSource: reserve.price?.priceSource,
      };
    });
  } catch (error) {
    console.error('Error fetching RMM reserves:', error);
    return [];
  }
}
