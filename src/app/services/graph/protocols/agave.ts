import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl } from '../utils';

// GraphQL query for Agave reserves (formerly markets)
const AGAVE_RESERVES_QUERY = `
  query getReserves {
    reserves(first: 20, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      decimals
      underlyingAsset
      totalLiquidity
      totalBorrows
      utilizationRate
      liquidityRate
      variableBorrowRate
      stableBorrowRate
      aToken {
        id
        totalSupply
      }
      price {
        id
        priceInEth
      }
      lastUpdateTimestamp
    }
  }
`;

const AGAVE_PROTOCOL_QUERY = `
  query getProtocol {
    protocol(id: "1") {
      id
      pools {
        id
      }
    }
  }
`;

// Interface for Agave reserves GraphQL response
interface AgaveReservesResponse {
  reserves: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
    underlyingAsset: string;
    totalLiquidity: string;
    totalBorrows: string;
    utilizationRate: string;
    liquidityRate: string;
    variableBorrowRate: string;
    stableBorrowRate: string;
    aToken: {
      id: string;
      totalSupply: string;
    };
    price: {
      id: string;
      priceInEth: string;
    };
    lastUpdateTimestamp: string;
  }[];
}

interface AgaveProtocolResponse {
  protocol: {
    id: string;
    pools: {
      id: string;
    }[];
  };
}

/**
 * Fetches lending markets from Agave and transforms them into strategies
 */
export async function getAgaveStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<AgaveReservesResponse>(
      GRAPH_CONFIG.ENDPOINTS.agave,
      AGAVE_RESERVES_QUERY
    );

    if (!data.reserves || !data.reserves.length) {
      return [];
    }

    return data.reserves.map((reserve): Strategy => {
      const liquidityRate = Number.parseFloat(reserve.liquidityRate) * 100;
      const utilization = Number.parseFloat(reserve.utilizationRate) * 100;
      const tvl = Number.parseFloat(reserve.totalLiquidity);
      const isStablecoin = reserve.symbol.includes('USD') || reserve.symbol.includes('DAI');

      // Store interest rates for logging/debugging
      const variableBorrowRate = Number.parseFloat(reserve.variableBorrowRate) * 100;
      const stableBorrowRate = Number.parseFloat(reserve.stableBorrowRate) * 100;

      // Calculate timestamp
      const lastUpdateTimestamp = new Date(Number(reserve.lastUpdateTimestamp) * 1000).toISOString();

      return {
        id: `agave-${reserve.symbol.toLowerCase()}`,
        name: `Agave ${reserve.symbol} Lending`,
        protocol: 'Agave',
        asset: reserve.symbol,
        type: 'Lending',
        description: `Deposit ${reserve.symbol} on Agave to earn interest`,
        apy: `${liquidityRate.toFixed(2)}%`,
        riskLevel: getRiskLevel(liquidityRate, { isStablecoin }),
        tvl: formatTVL(tvl),
        link: getProjectUrl('Agave'),
        network: 'gnosis',
        tags: ['lending', isStablecoin ? 'stablecoin' : 'volatile'],
        minInvestment: '1 xDAI',
        lastUpdated: lastUpdateTimestamp,
        utilization: `${utilization.toFixed(2)}%`
      };
    });
  } catch (error) {
    console.error('Error fetching Agave reserves:', error);
    return [];
  }
}

/**
 * Gets protocol overview data from Agave
 */
export async function getAgaveProtocolData() {
  try {
    const data = await fetchGraph<AgaveProtocolResponse>(
      GRAPH_CONFIG.ENDPOINTS.agave,
      AGAVE_PROTOCOL_QUERY
    );

    return data.protocol;
  } catch (error) {
    console.error('Error fetching Agave protocol data:', error);
    return null;
  }
}