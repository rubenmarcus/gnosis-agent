import { fetchGraph, GRAPH_CONFIG } from '../base';
import type { Strategy } from '../base';
import { formatTVL, getRiskLevel, getProjectUrl, getStrategyType } from '../utils';

// Use the endpoint from GRAPH_CONFIG
const SWAPR_ENDPOINT = GRAPH_CONFIG.ENDPOINTS.swapr;

// Query for Swapr factories
const SWAPR_FACTORIES_QUERY = `
  query getSwaprFactories {
    swaprFactories(first: 5) {
      id
      pairCount
      totalVolumeUSD
      totalVolumeNativeCurrency
    }
  }
`;

// Query for top tokens on Swapr
const SWAPR_TOKENS_QUERY = `
  query getTopTokens {
    tokens(first: 50, orderBy: totalLiquidity, orderDirection: desc) {
      id
      name
      symbol
      decimals
      totalLiquidity
      tradeVolume
      tradeVolumeUSD
    }
  }
`;

// Query for top pairs (liquidity pools) on Swapr
const SWAPR_PAIRS_QUERY = `
  query getTopPairs {
    pairs(first: 20, orderBy: reserveUSD, orderDirection: desc) {
      id
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
      reserve0
      reserve1
      reserveUSD
      volumeUSD
      txCount
    }
  }
`;

// Query for Swapr protocol metrics and overview
const SWAPR_OVERVIEW_QUERY = `
  query getSwaprOverview {
    swaprFactories(first: 1) {
      id
      pairCount
      totalVolumeUSD
      totalLiquidityUSD
      totalVolumeNativeCurrency
      totalLiquidityNativeCurrency
    }
    bundles(first: 1) {
      id
      nativeCurrencyPrice
    }
  }
`;

// Query for Swapr day data (historical)
const SWAPR_DAY_DATA_QUERY = `
  query getSwaprDayData {
    swaprDayDatas(first: 30, orderBy: date, orderDirection: desc) {
      id
      date
      dailyVolumeUSD
      totalLiquidityUSD
      txCount
    }
  }
`;

// Query for liquidity mining campaigns
const SWAPR_LIQUIDITY_MINING_QUERY = `
  query getLiquidityMiningCampaigns {
    liquidityMiningCampaigns(first: 20, orderBy: startsAt, orderDirection: desc) {
      id
      startsAt
      endsAt
      stakingCap
      rewards {
        id
        token {
          id
          name
          symbol
          decimals
        }
        amount
      }
      locked
      stakablePair {
        id
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
    }
  }
`;

// Interfaces for Swapr response types
interface SwaprFactoriesResponse {
  swaprFactories: {
    id: string;
    pairCount: string;
    totalVolumeUSD: string;
    totalVolumeNativeCurrency: string;
  }[];
}

interface SwaprTokensResponse {
  tokens: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
    totalLiquidity: string;
    tradeVolume: string;
    tradeVolumeUSD: string;
  }[];
}

interface SwaprPairsResponse {
  pairs: {
    id: string;
    token0: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    token1: {
      id: string;
      name: string;
      symbol: string;
      decimals: string;
    };
    reserve0: string;
    reserve1: string;
    reserveUSD: string;
    volumeUSD: string;
    txCount: string;
  }[];
}

interface SwaprOverviewResponse {
  swaprFactories: {
    id: string;
    pairCount: string;
    totalVolumeUSD: string;
    totalLiquidityUSD: string;
    totalVolumeNativeCurrency: string;
    totalLiquidityNativeCurrency: string;
  }[];
  bundles: {
    id: string;
    nativeCurrencyPrice: string;
  }[];
}

interface SwaprDayDataResponse {
  swaprDayDatas: {
    id: string;
    date: string;
    dailyVolumeUSD: string;
    totalLiquidityUSD: string;
    txCount: string;
  }[];
}

interface SwaprLiquidityMiningResponse {
  liquidityMiningCampaigns: {
    id: string;
    startsAt: string;
    endsAt: string;
    stakingCap: string;
    rewards: {
      id: string;
      token: {
        id: string;
        name: string;
        symbol: string;
        decimals: string;
      };
      amount: string;
    }[];
    locked: boolean;
    stakablePair: {
      id: string;
      token0: {
        symbol: string;
      };
      token1: {
        symbol: string;
      };
    };
  }[];
}

/**
 * Fetches Swapr factories information
 */
export async function getSwaprFactories() {
  try {
    const data = await fetchGraph<SwaprFactoriesResponse>(
      SWAPR_ENDPOINT,
      SWAPR_FACTORIES_QUERY
    );

    if (!data.swaprFactories || !data.swaprFactories.length) {
      return [];
    }

    return data.swaprFactories;
  } catch (error) {
    console.error('Error fetching Swapr factories:', error);
    return [];
  }
}

/**
 * Fetches top tokens from Swapr
 */
export async function getSwaprTopTokens() {
  try {
    const data = await fetchGraph<SwaprTokensResponse>(
      SWAPR_ENDPOINT,
      SWAPR_TOKENS_QUERY
    );

    if (!data.tokens || !data.tokens.length) {
      return [];
    }

    return data.tokens.map(token => ({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      decimals: Number.parseInt(token.decimals, 10),
      totalLiquidity: token.totalLiquidity,
      tradeVolume: token.tradeVolume,
      tradeVolumeUSD: token.tradeVolumeUSD
    }));
  } catch (error) {
    console.error('Error fetching Swapr tokens:', error);
    return [];
  }
}

/**
 * Fetches top liquidity pairs from Swapr and transforms them into strategies
 */
export async function getSwaprStrategies(): Promise<Strategy[]> {
  try {
    const data = await fetchGraph<SwaprPairsResponse>(
      SWAPR_ENDPOINT,
      SWAPR_PAIRS_QUERY
    );

    if (!data.pairs || !data.pairs.length) {
      return [];
    }

    return data.pairs.map((pair): Strategy => {
      const token0Symbol = pair.token0.symbol;
      const token1Symbol = pair.token1.symbol;
      const asset = `${token0Symbol}/${token1Symbol}`;
      const tvl = Number.parseFloat(pair.reserveUSD || '0');
      const dailyVolume = Number.parseFloat(pair.volumeUSD || '0') / 7; // Approximation

      // Calculate APY based on volume and fees
      // Assuming 0.3% fee structure like most AMMs
      const dailyFees = dailyVolume * 0.003;
      const yearlyFeesEstimate = dailyFees * 365;
      const apy = tvl > 0 ? (yearlyFeesEstimate / tvl) * 100 : 0;

      return {
        id: `swapr-${pair.id}`,
        name: `Swapr ${asset} Pool`,
        protocol: 'Swapr',
        asset,
        type: getStrategyType('Swapr', asset),
        description: `Provide liquidity for ${asset} on Swapr to earn trading fees`,
        apy: `${apy.toFixed(2)}%`,
        riskLevel: getRiskLevel(apy, {
          isStablecoin: [token0Symbol, token1Symbol].every(t =>
            ['USDC', 'USDT', 'DAI', 'WXDAI'].includes(t)),
          impermanentLossRisk: 'medium'
        }),
        tvl: formatTVL(tvl),
        link: getProjectUrl('Swapr'),
        network: 'gnosis',
        tags: [
          'dex',
          'liquidity-providing',
          token0Symbol,
          token1Symbol,
          dailyVolume > 10000 ? 'high-volume' : 'low-volume'
        ],
        minInvestment: '0.01 ETH equivalent',
        lastUpdated: new Date().toISOString(),
        totalVolume24h: formatTVL(dailyVolume),
        feesEarned24h: formatTVL(dailyFees),
        reserves: [pair.reserve0, pair.reserve1]
      };
    });
  } catch (error) {
    console.error('Error fetching Swapr pairs:', error);
    return [];
  }
}

/**
 * Fetches Swapr protocol overview metrics
 */
export async function getSwaprOverview() {
  try {
    const data = await fetchGraph<SwaprOverviewResponse>(
      SWAPR_ENDPOINT,
      SWAPR_OVERVIEW_QUERY
    );

    if (!data.swaprFactories || !data.swaprFactories.length) {
      return null;
    }

    const factory = data.swaprFactories[0];
    const bundle = data.bundles && data.bundles.length > 0 ? data.bundles[0] : null;

    return {
      totalPairs: Number.parseInt(factory.pairCount, 10),
      totalVolumeUSD: factory.totalVolumeUSD,
      totalLiquidityUSD: factory.totalLiquidityUSD || '0',
      nativeCurrencyPrice: bundle?.nativeCurrencyPrice || '0'
    };
  } catch (error) {
    console.error('Error fetching Swapr overview:', error);
    return null;
  }
}

/**
 * Fetches Swapr historical day data
 */
export async function getSwaprHistoricalData() {
  try {
    const data = await fetchGraph<SwaprDayDataResponse>(
      SWAPR_ENDPOINT,
      SWAPR_DAY_DATA_QUERY
    );

    if (!data.swaprDayDatas || !data.swaprDayDatas.length) {
      return [];
    }

    return data.swaprDayDatas.map(dayData => ({
      date: new Date(Number.parseInt(dayData.date, 10) * 1000).toISOString().split('T')[0],
      volumeUSD: Number.parseFloat(dayData.dailyVolumeUSD),
      tvlUSD: Number.parseFloat(dayData.totalLiquidityUSD),
      txCount: Number.parseInt(dayData.txCount, 10)
    }));
  } catch (error) {
    console.error('Error fetching Swapr historical data:', error);
    return [];
  }
}

/**
 * Fetches active liquidity mining campaigns on Swapr
 */
export async function getSwaprLiquidityMiningCampaigns() {
  try {
    const data = await fetchGraph<SwaprLiquidityMiningResponse>(
      SWAPR_ENDPOINT,
      SWAPR_LIQUIDITY_MINING_QUERY
    );

    if (!data.liquidityMiningCampaigns || !data.liquidityMiningCampaigns.length) {
      return [];
    }

    const now = Math.floor(Date.now() / 1000);

    return data.liquidityMiningCampaigns
      .filter(campaign => Number.parseInt(campaign.endsAt, 10) > now) // Only active campaigns
      .map(campaign => {
        const pairSymbol = `${campaign.stakablePair.token0.symbol}/${campaign.stakablePair.token1.symbol}`;
        const rewards = campaign.rewards.map(reward => ({
          token: reward.token.symbol,
          amount: reward.amount
        }));

        return {
          id: campaign.id,
          pair: pairSymbol,
          pairId: campaign.stakablePair.id,
          startsAt: new Date(Number.parseInt(campaign.startsAt, 10) * 1000).toISOString(),
          endsAt: new Date(Number.parseInt(campaign.endsAt, 10) * 1000).toISOString(),
          rewards,
          locked: campaign.locked,
          stakingCap: campaign.stakingCap
        };
      });
  } catch (error) {
    console.error('Error fetching Swapr liquidity mining campaigns:', error);
    return [];
  }
}
