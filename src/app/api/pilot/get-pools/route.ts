// src/app/api/pools/route.ts
import { NextResponse } from "next/server";

// Define types based on DeFi Llama API response
interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[] | null;
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions?: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  };
  poolMeta: string | null;
  mu?: number;
  sigma?: number;
  count?: number;
  outlier?: boolean;
  underlyingTokens: string[] | null;
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  apyBaseInception: number | null;
  chainId?: number;
  category?: string;
}

// Helper function to get token symbol
const getTokenSymbol = (tokenAddress: string): string => {
  // In a real implementation, you would map token addresses to symbols
  // For now, return a placeholder
  return `${tokenAddress.substring(0, 6)}...`;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Extract all filter parameters
  const project = searchParams.get('project');
  const symbol = searchParams.get('symbol');
  const minTvl = searchParams.get('minTvl');
  const maxTvl = searchParams.get('maxTvl');
  const minApy = searchParams.get('minApy');
  const maxApy = searchParams.get('maxApy');
  const minApyMean30d = searchParams.get('minApyMean30d');
  const maxApyMean30d = searchParams.get('maxApyMean30d');
  const asset = searchParams.get('asset');
  const stablecoin = searchParams.get('stablecoin');
  const ilRisk = searchParams.get('ilRisk');
  const exposure = searchParams.get('exposure');
  const predictedClass = searchParams.get('predictedClass');
  const minConfidence = searchParams.get('minConfidence');
  const risk = searchParams.get('risk') || 'all';
  const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

  // Step 1: Fetch all pools (cached to avoid rate limits)
  const res = await fetch('https://yields.llama.fi/pools', {
    next: { revalidate: 600 } // 10-minute cache
  });
  const { data } = await res.json();

  // Step 2: Filter for Gnosis (chainId=100)
  let gnosisPools = data.filter((pool: DefiLlamaPool) =>
    pool.chain === 'Gnosis' ||
    pool.chainId === 100
  );

  // Step 3: Apply additional filters
  if (project) {
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.project.toLowerCase() === project.toLowerCase());
  }

  if (symbol) {
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.symbol.toLowerCase().includes(symbol.toLowerCase()));
  }

  if (minTvl) {
    const minTvlValue = Number.parseFloat(minTvl);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) => pool.tvlUsd >= minTvlValue);
  }

  if (maxTvl) {
    const maxTvlValue = Number.parseFloat(maxTvl);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) => pool.tvlUsd <= maxTvlValue);
  }

  if (minApy) {
    const minApyValue = Number.parseFloat(minApy);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) => pool.apy >= minApyValue);
  }

  if (maxApy) {
    const maxApyValue = Number.parseFloat(maxApy);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) => pool.apy <= maxApyValue);
  }

  if (minApyMean30d) {
    const minApyMean30dValue = Number.parseFloat(minApyMean30d);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.apyMean30d !== null && pool.apyMean30d >= minApyMean30dValue);
  }

  if (maxApyMean30d) {
    const maxApyMean30dValue = Number.parseFloat(maxApyMean30d);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.apyMean30d !== null && pool.apyMean30d <= maxApyMean30dValue);
  }

  if (asset) {
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) => {
      // Check if asset is in the symbol or underlyingTokens
      const symbolMatch = pool.symbol.toLowerCase().includes(asset.toLowerCase());
      const underlyingMatch = pool.underlyingTokens?.some(token =>
        getTokenSymbol(token).toLowerCase().includes(asset.toLowerCase()));
      return symbolMatch || underlyingMatch;
    });
  }

  if (stablecoin !== null && stablecoin !== undefined) {
    const isStablecoin = stablecoin === 'true';
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) => pool.stablecoin === isStablecoin);
  }

  if (ilRisk) {
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.ilRisk.toLowerCase() === ilRisk.toLowerCase());
  }

  if (exposure) {
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.exposure.toLowerCase() === exposure.toLowerCase());
  }

  if (predictedClass) {
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.predictions?.predictedClass?.toLowerCase().includes(predictedClass.toLowerCase()));
  }

  if (minConfidence) {
    const minConfidenceValue = Number.parseFloat(minConfidence);
    gnosisPools = gnosisPools.filter((pool: DefiLlamaPool) =>
      pool.predictions?.binnedConfidence !== undefined &&
      pool.predictions.binnedConfidence >= minConfidenceValue);
  }

  if (risk !== 'all') {
    const riskMapping: Record<string, (pool: DefiLlamaPool) => boolean> = {
      low: (pool) => pool.ilRisk === 'no' && pool.stablecoin === true,
      medium: (pool) => pool.ilRisk === 'no' && pool.stablecoin === false,
      high: (pool) => pool.ilRisk === 'yes'
    };

    gnosisPools = gnosisPools.filter(riskMapping[risk] || (() => true));
  }

  // Step 4: Transform to your schema but maintain original fields
  const pools = gnosisPools.map((pool: DefiLlamaPool) => ({
    ...pool, // Include all original fields
    id: pool.pool,
    name: `${pool.project} ${pool.symbol}`,
    assets: pool.underlyingTokens?.map((t: string) => getTokenSymbol(t)) || [pool.symbol],
    risk: determineRiskLevel(pool),
  }));

  // Step 5: Apply pagination
  const paginatedPools = pools.slice(offset, offset + limit);

  return NextResponse.json({ pools: paginatedPools });
}

// Helper function to determine risk level based on pool properties
function determineRiskLevel(pool: DefiLlamaPool): string {
  if (pool.ilRisk === 'yes') {
    return 'high';
  }

  if (pool.stablecoin) {
    return 'low';
  }

  if (pool.category === 'lending') {
    return 'low';
  }

  return 'medium';
}