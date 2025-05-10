import { NextResponse } from 'next/server';

type Strategy = {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  type: string;
  description: string;
  apy: string;
  riskLevel: string;
  tvl: string;
  network: string;
  link: string;
  tags: string[];
  minInvestment: string;
  details: {
    platform: string;
    assetType: string;
    risks: string[];
    impermanentLoss: boolean;
    lockupPeriod: string;
    depositFee?: string;
    withdrawalFee?: string;
    compounding: boolean;
    howToEnter: string;
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('id');

    if (!strategyId) {
      return NextResponse.json(
        { error: 'Strategy ID parameter is required' },
        { status: 400 }
      );
    }

    const strategy = await getStrategyDetails(strategyId);

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Error fetching strategy details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy details' },
      { status: 500 }
    );
  }
}

// Mock function - would be replaced with an actual database call or API
async function getStrategyDetails(strategyId: string): Promise<Strategy | null> {
  // This would be replaced with real database lookups
  const strategies: Record<string, Strategy> = {
    'agave-xdai': {
      id: 'agave-xdai',
      name: 'Agave xDAI Lending',
      protocol: 'Agave',
      asset: 'xDAI',
      type: 'Lending',
      description: 'Deposit xDAI on Agave to earn interest from borrowers on the platform',
      apy: '5.2%',
      riskLevel: 'low',
      tvl: '$4.7M',
      network: 'gnosis',
      link: 'https://app.agave.finance',
      tags: ['stablecoin', 'lending'],
      minInvestment: '1 xDAI',
      details: {
        platform: 'Agave Finance',
        assetType: 'Stablecoin',
        risks: [
          'Smart contract risk',
          'Utilization risk (APY decreases with low utilization)'
        ],
        impermanentLoss: false,
        lockupPeriod: 'None',
        depositFee: '0%',
        withdrawalFee: '0%',
        compounding: true,
        howToEnter: 'Connect wallet to Agave and deposit xDAI into the lending pool'
      }
    },
    'honeyswap-gno-xdai': {
      id: 'honeyswap-gno-xdai',
      name: 'Honeyswap GNO-xDAI LP',
      protocol: 'Honeyswap',
      asset: 'GNO-xDAI',
      type: 'Liquidity Providing',
      description: 'Provide liquidity for GNO-xDAI pair on Honeyswap to earn trading fees',
      apy: '15.8%',
      riskLevel: 'medium',
      tvl: '$1.2M',
      network: 'gnosis',
      link: 'https://app.honeyswap.org',
      tags: ['amm', 'lp'],
      minInvestment: '10 xDAI equivalent',
      details: {
        platform: 'Honeyswap',
        assetType: 'Liquidity Pool Token',
        risks: [
          'Smart contract risk',
          'Impermanent loss risk',
          'Price volatility of GNO'
        ],
        impermanentLoss: true,
        lockupPeriod: 'None',
        depositFee: '0.3% (added to the pool)',
        withdrawalFee: '0%',
        compounding: false,
        howToEnter: 'Connect wallet to Honeyswap, add liquidity to the GNO-xDAI pool, and receive LP tokens'
      }
    },
    'curve-xdai-usdc': {
      id: 'curve-xdai-usdc',
      name: 'Curve xDAI-USDC Pool',
      protocol: 'Curve Finance',
      asset: 'xDAI-USDC',
      type: 'Stable Swap',
      description: 'Provide liquidity to xDAI-USDC pool on Curve to earn trading fees with minimal impermanent loss',
      apy: '4.8%',
      riskLevel: 'low',
      tvl: '$2.1M',
      network: 'gnosis',
      link: 'https://curve.fi',
      tags: ['stablecoin', 'swap'],
      minInvestment: '100 xDAI',
      details: {
        platform: 'Curve Finance',
        assetType: 'Stable LP Token',
        risks: [
          'Smart contract risk',
          'Minimal impermanent loss (stablecoins)',
          'Stablecoin de-peg risk'
        ],
        impermanentLoss: false,
        lockupPeriod: 'None',
        depositFee: '0.04%',
        withdrawalFee: '0%',
        compounding: false,
        howToEnter: 'Connect wallet to Curve Finance, add liquidity to the xDAI-USDC pool, and receive LP tokens'
      }
    },
    'bao-finance-vaults': {
      id: 'bao-finance-vaults',
      name: 'Bao Finance LP Vault',
      protocol: 'Bao Finance',
      asset: 'GNO-ETH',
      type: 'Yield Farming',
      description: 'Stake LP tokens in Bao Finance vaults to earn boosted yields and BAO tokens',
      apy: '24.5%',
      riskLevel: 'high',
      tvl: '$320K',
      network: 'gnosis',
      link: 'https://www.bao.finance',
      tags: ['farming', 'lp'],
      minInvestment: '50 xDAI equivalent',
      details: {
        platform: 'Bao Finance',
        assetType: 'LP Vault Token',
        risks: [
          'Smart contract risk',
          'Impermanent loss risk',
          'Price volatility of GNO and ETH',
          'Reward token (BAO) price risk'
        ],
        impermanentLoss: true,
        lockupPeriod: '3 days',
        withdrawalFee: '0.5%',
        compounding: true,
        howToEnter: 'First provide liquidity on Sushiswap for GNO-ETH, then deposit LP tokens into Bao Finance vaults'
      }
    }
  };

  return strategies[strategyId] || null;
}