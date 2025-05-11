import { NextResponse } from 'next/server';

// Minimal type definitions
interface DefiLlamaPool {
  pool: string;
  chain: string;
  chainId?: number;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  underlyingTokens?: string[];
  ilRisk?: string;
  category?: string;
}

export async function GET() {
  // Step 1: Fetch all pools (cached to avoid rate limits)
  const res = await fetch('https://yields.llama.fi/pools', {
    next: { revalidate: 600 } // 10-minute cache
  });
  const { data } = await res.json() as { data: DefiLlamaPool[] };

  // Step 2: Filter for Gnosis (chainId=100)
  const gnosisPools = data.filter((pool) =>
    pool.chain === 'Gnosis' ||
    pool.chainId === 100
  );

  // Step 3: Transform to your schema
  const pools = gnosisPools.map((pool) => ({
    id: pool.pool,
    name: `${pool.project} ${pool.symbol}`,
    apy: pool.apy.toFixed(2),
    tvl: pool.tvlUsd,
    assets: pool.underlyingTokens?.map(t => getTokenSymbol(t)) || [pool.symbol],
    risk: pool.ilRisk ? 'high' : pool.category === 'lending' ? 'low' : 'medium',
    project: pool.project,
  }));

  return NextResponse.json({ pools });
}

/**
 * Extract a readable token symbol from a token address
 */
function getTokenSymbol(tokenAddress: string): string {
  // Common Gnosis tokens
  const knownTokens: Record<string, string> = {
    '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d': 'WXDAI',
    '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1': 'WETH',
    '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83': 'USDC',
    '0x4ecaba5870353805a9f068101a40e0f32ed605c6': 'USDT',
    '0x8e5bbbb09ed1ebde8674cda39a0c169401db4252': 'WBTC',
    '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9': 'HNY',
  };

  // Convert to lowercase for matching
  const tokenAddressLower = tokenAddress.toLowerCase();

  if (knownTokens[tokenAddressLower]) {
    return knownTokens[tokenAddressLower];
  }

  // If token not known, return shortened address
  return `${tokenAddressLower.substr(0, 4)}...${tokenAddressLower.substr(-4)}`;
}