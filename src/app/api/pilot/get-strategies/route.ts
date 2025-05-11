import { NextResponse } from 'next/server';
import type { Strategy } from '@/services/graph';
import { getAllStrategies } from '@/services/graph';

// API endpoints
const DEFILLAMA_BASE_URL = 'https://yields.llama.fi';
const DEFILLAMA_TVL_URL = 'https://api.llama.fi';

// The Graph API endpoints for Gnosis Chain protocols
const GRAPH_ENDPOINTS = {
  honeyswap: 'https://api.thegraph.com/subgraphs/name/1hive/honeyswap-v2',
  agave: 'https://api.thegraph.com/subgraphs/name/agave-dao/agave',
  swapr: 'https://api.thegraph.com/subgraphs/name/dxgraphs/swapr-gnosis-chain'
};

// DeFi Llama API types
interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  url?: string;
  il_risk?: string;
  outlook?: string;
  stablecoin?: boolean;
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

    // Protocol names to filter by, if specified
    const protocolNames = protocol ? [protocol] : undefined;

    // Get all strategies
    let strategies = await getGnosisStrategies(source, protocolNames);

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

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy data' },
      { status: 500 }
    );
  }
}

// Fetch strategies from various sources
async function getGnosisStrategies(source: string = 'all', protocolNames?: string[]): Promise<Strategy[]> {
  try {
    let strategies: Strategy[] = [];

    // Fetch from DeFi Llama if source is 'all' or 'defillama'
    if (source === 'all' || source === 'defillama') {
      strategies = await getDefiLlamaStrategies();
    }

    // Fetch from subgraphs if source is 'all' or 'subgraph'
    if (source === 'all' || source === 'subgraph') {
      const subgraphStrategies = await getAllStrategies(protocolNames);

      // Merge subgraph data with DeFi Llama data when both sources are used
      if (source === 'all') {
        // Add unique strategies from subgraphs
        const defiLlamaIds = new Set(strategies.map(s => s.id));
        const uniqueSubgraphStrategies = subgraphStrategies.filter(s => !defiLlamaIds.has(s.id));

        strategies = [...strategies, ...uniqueSubgraphStrategies];
      } else {
        strategies = subgraphStrategies;
      }
    }

    return strategies;
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return getFallbackStrategies();
  }
}

// Fetch data from DeFi Llama API
async function getDefiLlamaStrategies(): Promise<Strategy[]> {
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
    const strategies = gnosisYields.map((pool: DefiLlamaPool): Strategy => {
      // Calculate risk level based on APY and other factors
      const riskLevel = getRiskLevel(
        pool.apy,
        pool.il_risk || 'medium',
        pool.outlook || 'neutral',
        pool.stablecoin || false
      );

      return {
        id: `${pool.project}-${pool.symbol.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: `${pool.project} ${pool.symbol}`,
        protocol: pool.project,
        asset: pool.symbol,
        type: getStrategyType(pool.project, pool.symbol),
        description: `${getStrategyType(pool.project, pool.symbol)} for ${pool.symbol} on ${pool.project}`,
        apy: `${pool.apy.toFixed(2)}%`,
        riskLevel,
        tvl: formatTVL(pool.tvlUsd),
        link: pool.url || getProjectUrl(pool.project),
        network: 'gnosis',
        tags: getStrategyTags(pool.project, pool.symbol, pool.stablecoin || false),
        minInvestment: '1 xDAI', // Default minimum
        lastUpdated: new Date().toISOString()
      };
    });

    return strategies;
  } catch (error) {
    console.error('Error fetching from DeFi Llama:', error);
    return [];
  }
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

function getProjectUrl(project: string): string {
  const projectMap: Record<string, string> = {
    'Agave': 'https://app.agave.finance',
    'Honeyswap': 'https://app.honeyswap.org',
    'Swapr': 'https://swapr.eth.link',
    'Curve': 'https://curve.fi',
    'Symmetric': 'https://symmetric.finance',
    'Bao Finance': 'https://www.bao.finance',
  };

  return projectMap[project] || 'https://defillama.com';
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

// Fallback strategies in case the API calls fail
function getFallbackStrategies(): Strategy[] {
  return [
    {
      id: 'agave-xdai',
      name: 'Agave xDAI Lending',
      protocol: 'Agave',
      asset: 'xDAI',
      type: 'Lending',
      description: 'Deposit xDAI on Agave to earn interest',
      apy: '5.2%',
      riskLevel: 'low',
      tvl: '$4.7M',
      link: 'https://app.agave.finance',
      network: 'gnosis',
      tags: ['stablecoin', 'lending'],
      minInvestment: '1 xDAI'
    },
    {
      id: 'honeyswap-gno-xdai',
      name: 'Honeyswap GNO-xDAI LP',
      protocol: 'Honeyswap',
      asset: 'GNO-xDAI',
      type: 'Liquidity Providing',
      description: 'Provide liquidity for GNO-xDAI pair on Honeyswap',
      apy: '15.8%',
      riskLevel: 'medium',
      tvl: '$1.2M',
      link: 'https://app.honeyswap.org',
      network: 'gnosis',
      tags: ['amm', 'lp'],
      minInvestment: '10 xDAI equivalent'
    },
    // Retaining other fallback strategies as in the original file
    {
      id: 'swapr-gno-wxdai',
      name: 'Swapr GNO-WXDAI LP',
      protocol: 'Swapr',
      asset: 'GNO-WXDAI',
      type: 'Liquidity Providing',
      description: 'Provide liquidity for GNO-WXDAI pair on Swapr',
      apy: '18.2%',
      riskLevel: 'medium',
      tvl: '$850K',
      link: 'https://swapr.eth.link',
      network: 'gnosis',
      tags: ['amm', 'lp'],
      minInvestment: '10 xDAI equivalent'
    },
    {
      id: 'bao-finance-vaults',
      name: 'Bao Finance LP Vault',
      protocol: 'Bao Finance',
      asset: 'GNO-ETH',
      type: 'Yield Farming',
      description: 'Stake LP tokens in Bao Finance vaults',
      apy: '24.5%',
      riskLevel: 'high',
      tvl: '$320K',
      link: 'https://www.bao.finance',
      network: 'gnosis',
      tags: ['farming', 'lp'],
      minInvestment: '50 xDAI equivalent'
    },
    {
      id: 'symmetric-staking',
      name: 'Symmetric SYMM Staking',
      protocol: 'Symmetric',
      asset: 'SYMM',
      type: 'Staking',
      description: 'Stake SYMM tokens to earn protocol fees',
      apy: '10.5%',
      riskLevel: 'medium',
      tvl: '$560K',
      link: 'https://symmetric.finance',
      network: 'gnosis',
      tags: ['staking', 'governance'],
      minInvestment: '100 SYMM'
    },
    {
      id: 'curve-xdai-usdc',
      name: 'Curve xDAI-USDC Pool',
      protocol: 'Curve Finance',
      asset: 'xDAI-USDC',
      type: 'Stable Swap',
      description: 'Provide liquidity to xDAI-USDC pool on Curve',
      apy: '4.8%',
      riskLevel: 'low',
      tvl: '$2.1M',
      link: 'https://curve.fi',
      network: 'gnosis',
      tags: ['stablecoin', 'swap'],
      minInvestment: '100 xDAI'
    }
  ];
}