import { NextResponse } from 'next/server';

type TokenBalance = {
  token: string;
  symbol: string;
  balance: string;
  usdValue: string;
};

type LpPosition = {
  protocol: string;
  pair: string;
  value: string;
  apr: string;
};

type Portfolio = {
  address: string;
  network: string;
  balances: TokenBalance[];
  lpPositions: LpPosition[];
  totalValueUSD: string;
};

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
  allocation?: number;
  network: string;
  recommendedAllocation?: {
    percent: number;
    amount: string;
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const riskProfile = searchParams.get('riskProfile') || 'medium'; // low, medium, high
    const investmentAmount = searchParams.get('investmentAmount');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Get user portfolio and available strategies
    const portfolio = await fetchPortfolioFromGnosis(address);
    const strategies = await getStrategiesForRiskProfile(riskProfile);

    // Generate optimized allocation
    const optimizedAllocation = await generateOptimizedAllocation(
      portfolio,
      strategies,
      riskProfile,
      investmentAmount ? Number.parseFloat(investmentAmount) : undefined
    );

    return NextResponse.json({
      optimizedAllocation,
      currentAllocation: portfolio,
      recommendedStrategies: strategies.slice(0, 3) // Top 3 strategies
    });
  } catch (error) {
    console.error('Error optimizing portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to optimize portfolio' },
      { status: 500 }
    );
  }
}

// Mock function - would be replaced with actual blockchain interaction
async function fetchPortfolioFromGnosis(address: string): Promise<Portfolio> {
  // In a real application, this would fetch data from the blockchain
  return {
    address,
    network: 'gnosis',
    balances: [
      {
        token: 'xDAI',
        symbol: 'xDAI',
        balance: '1250.45',
        usdValue: '1250.45'
      },
      {
        token: '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb',
        symbol: 'GNO',
        balance: '4.75',
        usdValue: '950.00'
      },
      {
        token: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
        symbol: 'WXDAI',
        balance: '500.00',
        usdValue: '500.00'
      }
    ],
    lpPositions: [
      {
        protocol: 'Honeyswap',
        pair: 'GNO-xDAI',
        value: '325.50',
        apr: '12.4%'
      }
    ],
    totalValueUSD: '3025.95'
  };
}

// Mock function - would be replaced with actual strategy fetching
async function getStrategiesForRiskProfile(riskProfile: string): Promise<Strategy[]> {
  // In a real application, this would fetch from a database or API
  const allStrategies: Strategy[] = [
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
      allocation: 40, // % of portfolio
      network: 'gnosis'
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
      allocation: 30, // % of portfolio
      network: 'gnosis'
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
      allocation: 20, // % of portfolio
      network: 'gnosis'
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
      allocation: 10, // % of portfolio
      network: 'gnosis'
    }
  ];

  // Filter strategies based on risk profile
  if (riskProfile === 'low') {
    return allStrategies.filter(s => s.riskLevel === 'low');
  }

  if (riskProfile === 'medium') {
    return allStrategies.filter(s => s.riskLevel !== 'high');
  }

  return allStrategies; // high risk includes all strategies
}

// Mock function - would be replaced with actual portfolio optimization algorithm
async function generateOptimizedAllocation(
  portfolio: Portfolio,
  strategies: Strategy[],
  riskProfile: string,
  investmentAmount?: number
) {
  // Total available for allocation
  const totalAvailable = investmentAmount || Number.parseFloat(portfolio.totalValueUSD);

  // Adjust allocations based on risk profile
  const allocations: {[key: string]: number} = {};

  if (riskProfile === 'low') {
    // Conservative allocation for low risk
    allocations['agave-xdai'] = 0.7;
    allocations['curve-xdai-usdc'] = 0.3;
  } else if (riskProfile === 'medium') {
    // Balanced allocation for medium risk
    allocations['agave-xdai'] = 0.4;
    allocations['curve-xdai-usdc'] = 0.2;
    allocations['honeyswap-gno-xdai'] = 0.4;
  } else {
    // Aggressive allocation for high risk
    allocations['agave-xdai'] = 0.2;
    allocations['curve-xdai-usdc'] = 0.1;
    allocations['honeyswap-gno-xdai'] = 0.4;
    allocations['bao-finance-vaults'] = 0.3;
  }

  // Calculate actual USD values based on allocations
  const recommendations = strategies.map(strategy => {
    const allocationPercent = allocations[strategy.id] || 0;
    const allocationAmount = totalAvailable * allocationPercent;

    return {
      ...strategy,
      recommendedAllocation: {
        percent: allocationPercent * 100,
        amount: allocationAmount.toFixed(2)
      }
    };
  }).filter(s => allocations[s.id]); // Only include strategies with allocations

  return {
    riskProfile,
    totalInvestment: totalAvailable.toFixed(2),
    expectedAnnualYield: calculateExpectedYield(recommendations, totalAvailable).toFixed(2),
    recommendations
  };
}

function calculateExpectedYield(recommendations: Strategy[], totalInvestment: number) {
  let totalYield = 0;

  for (const rec of recommendations) {
    const apy = Number.parseFloat(rec.apy.replace('%', '')) / 100;
    const amount = Number.parseFloat(rec.recommendedAllocation?.amount || '0');
    totalYield += amount * apy;
  }

  return (totalYield / totalInvestment) * 100; // Return as percentage
}