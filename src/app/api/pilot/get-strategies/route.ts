import { NextResponse } from 'next/server';
import { fetchEvmBalances, type WalletBalance } from '@/app/data/getUserBalance';

// API endpoints
const DEFILLAMA_BASE_URL = 'https://yields.llama.fi';
const DEFILLAMA_TVL_URL = 'https://api.llama.fi';

// Define our own Strategy interface
export interface Strategy {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  type: string;
  description: string;
  apy: string;
  riskLevel: string;
  tvl: string;
  link: string;
  network: string;
  tags: string[];
  minInvestment: string;
  lastUpdated: string;
}

// Simple in-memory cache with expiration
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class StrategiesCache {
  private cache: Record<string, CacheEntry<Strategy[]>> = {};
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  set(key: string, data: Strategy[], ttl: number = this.DEFAULT_TTL): void {
    this.cache[key] = {
      data,
      expiry: Date.now() + ttl
    };
  }

  get(key: string): Strategy[] | null {
    const entry = this.cache[key];
    if (!entry) return null;

    // Return null if cache expired
    if (Date.now() > entry.expiry) {
      delete this.cache[key];
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    delete this.cache[key];
  }
}

const strategiesCache = new StrategiesCache();

// DeFi Llama API types
interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number | null;
  apyReward?: number | null;
  apyPct1D?: number | null;
  apyPct7D?: number | null;
  apyPct30D?: number | null;
  apyMean30d?: number | null;
  url?: string;
  il_risk?: string;
  ilRisk?: string;
  outlook?: string;
  stablecoin?: boolean;
  exposure?: string;
  predictions?: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  };
  pool?: string;
  underlyingTokens?: string[] | null;
  rewardTokens?: string[] | null;
}

interface DefiLlamaResponse {
  data: DefiLlamaPool[];
  status: string;
}

// The Graph interface types
interface GraphLiquidityPool {
  id: string;
  token0: { symbol: string };
  token1: { symbol: string };
  volumeUSD: string;
  tvlUSD: string;
  feesUSD: string;
  reserve0: string;
  reserve1: string;
}

interface GraphMoneyMarket {
  id: string;
  symbol: string;
  totalBorrowed: string;
  totalLiquidity: string;
  utilizationRate: string;
  liquidityRate: string;
}

// Enhanced Strategy type with additional fields from get-pools
interface EnhancedStrategy extends Strategy {
  id: string;
  apyBase?: number | null;
  apyReward?: number | null;
  apyPct1D?: number | null;
  apyPct7D?: number | null;
  apyPct30D?: number | null;
  apyMean30d?: number | null;
  exposure?: string;
  underlyingTokens?: string[] | null;
  rewardTokens?: string[] | null;
  pool?: string;
  predictions?: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  };
  portfolioMatch?: {
    matchingTokens: string[];
    matchScore: number;
    recommendationReason: string;
  };
}

// Strategy risk mapping helper
const getRiskLevel = (apy: number, il_risk: string, outlook: string, stablecoin: boolean): string => {
  if (stablecoin && il_risk === 'no') return 'low';
  if (apy > 20 || il_risk === 'high' || outlook === 'bad') return 'high';
  return 'medium';
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel'); // low, medium, high, or all
    const minApy = searchParams.get('minApy');
    const maxApy = searchParams.get('maxApy');
    const source = searchParams.get('source') || 'all'; // all, defillama, subgraph
    const protocol = searchParams.get('protocol'); // specific protocol filter
    const skipCache = searchParams.get('skipCache') === 'true';
    const walletAddress = searchParams.get('address'); // Add wallet address for portfolio analysis
    const minApyMean30d = searchParams.get('minApyMean30d');
    const maxApyMean30d = searchParams.get('maxApyMean30d');
    const asset = searchParams.get('asset');
    const exposure = searchParams.get('exposure');
    const predictedClass = searchParams.get('predictedClass');
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    // Generate cache key based on query parameters
    const cacheKey = `strategies:${riskLevel || 'all'}:${minApy || '0'}:${maxApy || 'max'}:${source}:${protocol || 'all'}:${walletAddress || 'none'}:${minApyMean30d || '0'}:${maxApyMean30d || 'max'}:${asset || 'all'}:${exposure || 'all'}:${predictedClass || 'all'}`;

    // Try to get from cache first unless skipCache is true
    let strategies: EnhancedStrategy[] = [];
    if (!skipCache) {
      const cachedStrategies = strategiesCache.get(cacheKey);
      if (cachedStrategies) {
        return NextResponse.json({
          strategies: cachedStrategies.slice(offset, offset + limit),
          total: cachedStrategies.length
        });
      }
    }

    // Protocol names to filter by, if specified
    const protocolNames = protocol ? [protocol] : undefined;

    // Get all strategies
    strategies = await getGnosisStrategies(source, protocolNames);

    // Get user portfolio data if wallet address is provided
    let portfolioData: WalletBalance[] = [];
    if (walletAddress) {
      try {
        const balances = await fetchEvmBalances(walletAddress);
        portfolioData = balances.filter(token => token.token.chainId === 100); // Filter for Gnosis chain

        // Analyze strategies against portfolio
        strategies = analyzePortfolioStrategies(strategies, portfolioData);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        // Continue with strategy filtering even if portfolio analysis failed
      }
    }

    // Filter by risk level if specified
    if (riskLevel && riskLevel !== 'all') {
      strategies = strategies.filter((strategy) => strategy.riskLevel === riskLevel);
    }

    // Filter by min APY if specified
    if (minApy) {
      strategies = strategies.filter(
        (strategy) => Number.parseFloat(strategy.apy.replace('%', '')) >= Number.parseFloat(minApy)
      );
    }

    // Filter by max APY if specified
    if (maxApy) {
      strategies = strategies.filter(
        (strategy) => Number.parseFloat(strategy.apy.replace('%', '')) <= Number.parseFloat(maxApy)
      );
    }

    // Filter by min 30-day mean APY if specified
    if (minApyMean30d) {
      strategies = strategies.filter(
        (strategy) => strategy.apyMean30d != null &&
                    strategy.apyMean30d >= Number.parseFloat(minApyMean30d)
      );
    }

    // Filter by max 30-day mean APY if specified
    if (maxApyMean30d) {
      strategies = strategies.filter(
        (strategy) => strategy.apyMean30d != null &&
                    strategy.apyMean30d <= Number.parseFloat(maxApyMean30d)
      );
    }

    // Filter by asset if specified
    if (asset) {
      strategies = strategies.filter(
        (strategy) =>
          strategy.asset.toLowerCase().includes(asset.toLowerCase()) ||
          (strategy.underlyingTokens?.some(token => token.toLowerCase().includes(asset.toLowerCase())))
      );
    }

    // Filter by exposure if specified
    if (exposure) {
      strategies = strategies.filter(
        (strategy) => strategy.exposure?.toLowerCase() === exposure.toLowerCase()
      );
    }

    // Filter by predicted class if specified
    if (predictedClass) {
      strategies = strategies.filter(
        (strategy) => strategy.predictions?.predictedClass.toLowerCase().includes(predictedClass.toLowerCase())
      );
    }

    // Sort strategies by portfolio match score if wallet address is provided
    if (walletAddress) {
      strategies.sort((a, b) => {
        // First sort by match score (if available)
        if (a.portfolioMatch && b.portfolioMatch) {
          return b.portfolioMatch.matchScore - a.portfolioMatch.matchScore;
        }
        // If one has a match and the other doesn't, prioritize the match
        if (a.portfolioMatch) return -1;
        if (b.portfolioMatch) return 1;

        // Otherwise sort by APY
        return Number.parseFloat(b.apy.replace('%', '')) - Number.parseFloat(a.apy.replace('%', ''));
      });
    } else {
      // Default sort by APY if no wallet address
      strategies.sort((a, b) =>
        Number.parseFloat(b.apy.replace('%', '')) - Number.parseFloat(a.apy.replace('%', ''))
      );
    }

    // Store in cache for future requests
    strategiesCache.set(cacheKey, strategies);

    // Apply pagination
    const paginatedStrategies = strategies.slice(offset, offset + limit);

    return NextResponse.json({
      strategies: paginatedStrategies,
      total: strategies.length
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy data' },
      { status: 500 }
    );
  }
}

// Fetch strategies from various sources
async function getGnosisStrategies(source = 'all', protocolNames?: string[]) {
  try {
    // Only fetch from DeFi Llama regardless of source parameter
    const strategies = await getDefiLlamaStrategies();
    return strategies;
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }
}

// Fetch data from DeFi Llama API
async function getDefiLlamaStrategies(): Promise<EnhancedStrategy[]> {
  try {
    // Fetch yield data from DeFi Llama
    const response = await fetch(`${DEFILLAMA_BASE_URL}/pools`);

    if (!response.ok) {
      throw new Error(`DeFi Llama API returned ${response.status}`);
    }

    const yieldData: DefiLlamaResponse = await response.json();

    // Filter for Gnosis Chain (chain ID 100)
    const gnosisYields = yieldData.data.filter((pool: DefiLlamaPool) =>
      pool.chain === 'Gnosis' || pool.chain === 'xDai' || pool.chain === '100'
    );

    // Transform the data to match our strategy format
    const strategies = gnosisYields.map((pool: DefiLlamaPool): EnhancedStrategy => {
      // Handle different field names for ilRisk
      const ilRisk = pool.ilRisk || pool.il_risk || 'medium';

      // Calculate risk level based on APY and other factors
      const riskLevel = getRiskLevel(
        pool.apy,
        ilRisk,
        pool.outlook || 'neutral',
        pool.stablecoin || false
      );

      return {
        id: pool.pool || `${pool.project}-${pool.symbol.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: `${pool.project} ${pool.symbol}`,
        protocol: pool.project,
        asset: pool.symbol,
        type: getStrategyType(pool.project, pool.symbol),
        description: `${getStrategyType(pool.project, pool.symbol)} for ${pool.symbol} on ${pool.project}`,
        apy: `${pool.apy.toFixed(2)}%`,
        riskLevel,
        tvl: formatTVL(pool.tvlUsd),
        link: pool.url || 'https://defillama.com', // Default to DeFiLlama
        network: 'gnosis',
        tags: getStrategyTags(pool.project, pool.symbol, pool.stablecoin || false),
        minInvestment: '1 xDAI', // Default minimum
        lastUpdated: new Date().toISOString(),
        // Additional fields from DefiLlama
        apyBase: pool.apyBase,
        apyReward: pool.apyReward,
        apyPct1D: pool.apyPct1D,
        apyPct7D: pool.apyPct7D,
        apyPct30D: pool.apyPct30D,
        apyMean30d: pool.apyMean30d,
        exposure: pool.exposure,
        underlyingTokens: pool.underlyingTokens,
        rewardTokens: pool.rewardTokens,
        pool: pool.pool,
        predictions: pool.predictions
      };
    });

    return strategies;
  } catch (error) {
    console.error('Error fetching from DeFi Llama:', error);
    return [];
  }
}

// Export the function so it can be used by other files
export { getDefiLlamaStrategies };

// Analyze user portfolio against available strategies
function analyzePortfolioStrategies(strategies: EnhancedStrategy[], portfolio: WalletBalance[]): EnhancedStrategy[] {
  // Extract token symbols from portfolio
  const portfolioTokens = portfolio.map(item => item.token.symbol.toLowerCase());

  return strategies.map(strategy => {
    // Check for matching tokens in the strategy
    const matchingTokens: string[] = [];

    // Check the main asset
    if (portfolioTokens.includes(strategy.asset.toLowerCase())) {
      matchingTokens.push(strategy.asset);
    }

    // Check underlying tokens if available
    if (strategy.underlyingTokens) {
      for (const token of strategy.underlyingTokens) {
        if (portfolioTokens.includes(token.toLowerCase())) {
          matchingTokens.push(token);
        }
      }
    }

    // If there are matching tokens, add portfolio match data
    if (matchingTokens.length > 0) {
      strategy.portfolioMatch = {
        matchingTokens,
        matchScore: calculateMatchScore(strategy, matchingTokens, portfolio),
        recommendationReason: generateRecommendation(strategy, matchingTokens)
      };
    }

    return strategy;
  });
}

// Calculate a match score based on portfolio tokens and strategy attributes
function calculateMatchScore(strategy: EnhancedStrategy, matchingTokens: string[], portfolio: WalletBalance[]): number {
  // Base score based on number of matching tokens
  let score = matchingTokens.length * 10;

  // Adjust score based on risk level preference (assuming lower risk is preferred)
  if (strategy.riskLevel === 'low') {
    score += 15;
  } else if (strategy.riskLevel === 'medium') {
    score += 10;
  } else {
    score += 5;
  }

  // Adjust score based on APY (higher APY gets higher score)
  const apy = Number.parseFloat(strategy.apy.replace('%', ''));
  if (apy > 20) {
    score += 15;
  } else if (apy > 10) {
    score += 10;
  } else if (apy > 5) {
    score += 5;
  }

  // Calculate what percentage of portfolio is matching tokens
  const totalPortfolioValue = portfolio.reduce((sum, token) => sum + (token.usdValue || 0), 0);
  const matchingValue = portfolio
    .filter(token => matchingTokens.includes(token.token.symbol))
    .reduce((sum, token) => sum + (token.usdValue || 0), 0);

  // Add score based on percentage of portfolio
  if (totalPortfolioValue > 0) {
    const percentage = (matchingValue / totalPortfolioValue) * 100;
    score += Math.min(percentage, 50); // Cap at 50 points
  }

  return score;
}

// Generate personalized recommendation text
function generateRecommendation(strategy: EnhancedStrategy, matchingTokens: string[]): string {
  if (matchingTokens.length > 1) {
    return `This strategy uses multiple tokens from your portfolio (${matchingTokens.join(', ')}).`;
  }

  return `This strategy uses ${matchingTokens[0]} which is in your portfolio.`;
}

// Helper functions for strategy transformation
function getStrategyType(project: string, symbol: string): string {
  const projectLower = project.toLowerCase();

  if (projectLower.includes('lend') || ['aave', 'agave', 'compound'].includes(projectLower)) {
    return 'Lending';
  }

  if (symbol.includes('-') || symbol.includes('/')) {
    return 'Liquidity Providing';
  }

  if (projectLower.includes('stake') || projectLower.includes('vaults')) {
    return 'Staking';
  }

  return 'Yield Farming';
}

function getStrategyTags(project: string, symbol: string, isStablecoin: boolean): string[] {
  const tags: string[] = [];

  if (isStablecoin || symbol.includes('DAI') || symbol.includes('USDC') || symbol.includes('USDT')) {
    tags.push('stablecoin');
  }

  if (symbol.includes('-') || symbol.includes('/')) {
    tags.push('lp');
  }

  const projectLower = project.toLowerCase();
  if (projectLower.includes('lend') || ['aave', 'agave', 'compound'].includes(projectLower)) {
    tags.push('lending');
  }

  if (projectLower.includes('stake')) {
    tags.push('staking');
  }

  return tags;
}

function formatTVL(tvlUsd: number): string {
  if (tvlUsd >= 1000000000) {
    return `$${(tvlUsd / 1000000000).toFixed(2)}B`;
  }
  if (tvlUsd >= 1000000) {
    return `$${(tvlUsd / 1000000).toFixed(2)}M`;
  }
  if (tvlUsd >= 1000) {
    return `$${(tvlUsd / 1000).toFixed(2)}K`;
  }
  return `$${tvlUsd.toFixed(2)}`;
}