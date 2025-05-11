import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl } from '../utils';

// GraphQL query for Aave markets
const AAVE_MARKETS_QUERY = `
  query getMarkets($first: Int = 100) {
    markets(first: $first, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      inputToken {
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
      totalBorrowBalanceUSD
      inputTokenBalance
      outputTokenSupply
      rates {
        id
        rate
        side
        type
      }
      reserves {
        id
        reserveFactor
      }
      createdTimestamp
      liquidationThreshold
      liquidationPenalty
      canUseAsCollateral
      canBorrowFrom
      maximumLTV
      isActive
    }
  }
`;

const AAVE_PROTOCOL_QUERY = `
  query getProtocol {
    lendingProtocols(first: 1) {
      id
      name
      slug
      schemaVersion
      subgraphVersion
      methodologyVersion
      network
      type
      lendingType
      riskType
      totalValueLockedUSD
      totalBorrowBalanceUSD
      totalDepositBalanceUSD
      totalPoolCount
      cumulativeUniqueUsers
      cumulativeLiquidateUSD
      cumulativeSupplySideRevenueUSD
      cumulativeProtocolSideRevenueUSD
    }
  }
`;

const AAVE_USAGE_METRICS_QUERY = `
  query getUsageMetrics($first: Int = 7) {
    usageMetricsDailySnapshots(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      timestamp
      dailyActiveUsers
      cumulativeUniqueUsers
      dailyActiveDepositors
      dailyActiveBorrowers
      dailyActiveLiquidators
      dailyActiveLiquidatees
      dailyTransactionCount
      totalPoolCount
    }
  }
`;

// Interface for Aave markets GraphQL response
interface AaveMarketsResponse {
  markets: {
    id: string;
    name: string;
    inputToken: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    outputToken: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    totalValueLockedUSD: string;
    totalBorrowBalanceUSD: string;
    inputTokenBalance: string;
    outputTokenSupply: string;
    rates: {
      id: string;
      rate: string;
      side: string;
      type: string;
    }[];
    reserves: {
      id: string;
      reserveFactor: string;
    }[];
    createdTimestamp: string;
    liquidationThreshold: string;
    liquidationPenalty: string;
    canUseAsCollateral: boolean;
    canBorrowFrom: boolean;
    maximumLTV: string;
    isActive: boolean;
  }[];
}

interface AaveProtocolResponse {
  lendingProtocols: {
    id: string;
    name: string;
    slug: string;
    schemaVersion: string;
    subgraphVersion: string;
    methodologyVersion: string;
    network: string;
    type: string;
    lendingType: string;
    riskType: string;
    totalValueLockedUSD: string;
    totalBorrowBalanceUSD: string;
    totalDepositBalanceUSD: string;
    totalPoolCount: number;
    cumulativeUniqueUsers: number;
    cumulativeLiquidateUSD: string;
    cumulativeSupplySideRevenueUSD: string;
    cumulativeProtocolSideRevenueUSD: string;
  }[];
}

interface AaveUsageMetricsResponse {
  usageMetricsDailySnapshots: {
    id: string;
    timestamp: string;
    dailyActiveUsers: number;
    cumulativeUniqueUsers: number;
    dailyActiveDepositors: number;
    dailyActiveBorrowers: number;
    dailyActiveLiquidators: number;
    dailyActiveLiquidatees: number;
    dailyTransactionCount: number;
    totalPoolCount: number;
  }[];
}

/**
 * Fetches lending markets from Aave and transforms them into strategies
 */
export async function getAaveStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<AaveMarketsResponse>(
      GRAPH_CONFIG.ENDPOINTS.aave,
      AAVE_MARKETS_QUERY
    );

    if (!data.markets || !data.markets.length) {
      return [];
    }

    return data.markets
      .filter(market => market.isActive)
      .map((market): Strategy => {
        // Find supply rate (deposit APY)
        const supplyRate = market.rates.find(
          rate => rate.side === 'LENDER' && rate.type === 'VARIABLE'
        );
        const depositApy = supplyRate ? Number.parseFloat(supplyRate.rate) * 100 : 0;

        // Calculate utilization as the ratio of borrowed to total value locked
        const utilization = market.totalValueLockedUSD !== '0'
          ? (Number.parseFloat(market.totalBorrowBalanceUSD) / Number.parseFloat(market.totalValueLockedUSD)) * 100
          : 0;

        const tvl = Number.parseFloat(market.totalValueLockedUSD);
        const symbol = market.inputToken.symbol;
        const isStablecoin = symbol.includes('USD') || symbol.includes('DAI') || symbol === 'USDT' || symbol === 'USDC';

        // Calculate timestamp
        const lastUpdateTimestamp = new Date(Number(market.createdTimestamp) * 1000).toISOString();

        return {
          id: `aave-${market.inputToken.symbol.toLowerCase()}`,
          name: `Aave ${market.inputToken.symbol} Lending`,
          protocol: 'Aave',
          asset: market.inputToken.symbol,
          type: 'Lending',
          description: `Deposit ${market.inputToken.symbol} on Aave to earn interest`,
          apy: `${depositApy.toFixed(2)}%`,
          riskLevel: getRiskLevel(depositApy, { isStablecoin }),
          tvl: formatTVL(tvl),
          link: getProjectUrl('Aave'),
          network: 'ethereum', // This may need to be dynamic based on actual deployment
          tags: ['lending', isStablecoin ? 'stablecoin' : 'volatile'],
          minInvestment: '0.01 ETH', // This is a placeholder and should be adjusted
          lastUpdated: lastUpdateTimestamp,
          utilization: `${utilization.toFixed(2)}%`
        };
      });
  } catch (error) {
    console.error('Error fetching Aave markets:', error);
    return [];
  }
}

/**
 * Gets protocol overview data from Aave
 */
export async function getAaveProtocolData() {
  try {
    const data = await fetchGraph<AaveProtocolResponse>(
      GRAPH_CONFIG.ENDPOINTS.aave,
      AAVE_PROTOCOL_QUERY
    );

    return data.lendingProtocols?.[0] || null;
  } catch (error) {
    console.error('Error fetching Aave protocol data:', error);
    return null;
  }
}

/**
 * Gets usage metrics from Aave
 */
export async function getAaveUsageMetrics(days = 7) {
  try {
    const data = await fetchGraph<AaveUsageMetricsResponse>(
      GRAPH_CONFIG.ENDPOINTS.aave,
      AAVE_USAGE_METRICS_QUERY,
      { first: days }
    );

    return data.usageMetricsDailySnapshots || [];
  } catch (error) {
    console.error('Error fetching Aave usage metrics:', error);
    return [];
  }
}
