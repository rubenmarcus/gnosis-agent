/**
 * Format TVL values with appropriate suffixes (B, M, K)
 */
export function formatTVL(tvlUsd: number): string {
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

/**
 * Determine risk level based on APY and other factors
 */
export function getRiskLevel(apy: number, options: {
  isStablecoin?: boolean;
  isStableSwap?: boolean;
  impermanentLossRisk?: 'low' | 'medium' | 'high';
} = {}): string {
  const { isStablecoin, isStableSwap, impermanentLossRisk } = options;

  // Low risk: stablecoins with reasonable APY
  if ((isStablecoin || isStableSwap) && apy < 15) {
    return 'low';
  }

  // High risk: very high APY or high impermanent loss risk
  if (apy > 50 || impermanentLossRisk === 'high') {
    return 'high';
  }

  // Medium risk for everything else
  return 'medium';
}

/**
 * Get project URL for known DeFi protocols on Gnosis Chain
 */
export function getProjectUrl(protocol: string): string {
  const projectMap: Record<string, string> = {
    'Agave': 'https://app.agave.finance',
    'Honeyswap': 'https://app.honeyswap.org',
    'Swapr': 'https://swapr.eth.link',
    'Curve': 'https://curve.fi',
    'Symmetric': 'https://symmetric.finance',
    'Bao Finance': 'https://www.bao.finance',
    'SushiSwap': 'https://app.sushi.com/swap',
    'Balancer': 'https://app.balancer.fi/#/gnosis-chain'
  };

  return projectMap[protocol] || 'https://defillama.com';
}

/**
 * Determine strategy type based on protocol and asset
 */
export function getStrategyType(protocol: string, symbol: string): string {
  const protocolLower = protocol.toLowerCase();

  if (protocolLower.includes('lend') || ['aave', 'agave', 'compound'].includes(protocolLower)) {
    return 'Lending';
  }

  if (protocolLower.includes('swap') || symbol.includes('-') || symbol.includes('/')) {
    return 'Liquidity Providing';
  }

  if (protocolLower.includes('stake') || protocolLower.includes('wise')) {
    return 'Staking';
  }

  if (protocolLower.includes('vault') || protocolLower.includes('yearn')) {
    return 'Yield Farming';
  }

  return 'Yield Farming';
}