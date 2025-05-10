import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel'); // low, medium, high, or all
    const minApy = searchParams.get('minApy');
    const maxApy = searchParams.get('maxApy');

    // Get all strategies
    let strategies = await getGnosisStrategies();

    // Filter by risk level if specified
    if (riskLevel && riskLevel !== 'all') {
      strategies = strategies.filter(strategy => strategy.riskLevel === riskLevel);
    }

    // Filter by min APY if specified
    if (minApy) {
      strategies = strategies.filter(
        strategy => Number.parseFloat(strategy.apy.replace('%', '')) >= Number.parseFloat(minApy)
      );
    }

    // Filter by max APY if specified
    if (maxApy) {
      strategies = strategies.filter(
        strategy => Number.parseFloat(strategy.apy.replace('%', '')) <= Number.parseFloat(maxApy)
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

// Mock function - would be replaced with actual data source or API
async function getGnosisStrategies() {
  // This would be replaced with a real data source
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