import { NextResponse } from 'next/server';
import { getAddress } from 'viem';

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
    const usePoolSuggestions = searchParams.get('usePoolSuggestions') !== 'false'; // default to true

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Get user portfolio and available strategies
    const portfolio = await fetchPortfolioFromGnosis(address);
    let strategies = await getStrategiesForRiskProfile(riskProfile);

    // If enabled, fetch additional strategies from liquidity pools
    if (usePoolSuggestions) {
      const poolStrategies = await getStrategiesFromPools(riskProfile);
      // Combine strategies, removing duplicates (preferring pool strategies if any overlap)
      strategies = mergeStrategies(strategies, poolStrategies);
    }

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

// Function to fetch additional strategies from liquidity pools
async function getStrategiesFromPools(riskProfile: string): Promise<Strategy[]> {
  try {
    // Determine minimum APY based on risk profile
    const minApy = riskProfile === 'low' ? 3 : riskProfile === 'medium' ? 5 : 0;

    // Fetch strategies from the pools endpoint with appropriate risk-based filters
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const poolUrl = apiUrl
      ? `${apiUrl}/api/pilot/suggest-strategies-from-pools?minApy=${minApy}&limit=10`
      : `/api/pilot/suggest-strategies-from-pools?minApy=${minApy}&limit=10`;

    const poolResponse = await fetch(new URL(poolUrl, 'http://localhost:3000'));

    if (!poolResponse.ok) {
      console.error(`Failed to fetch pool strategies: ${poolResponse.statusText}`);
      return [];
    }

    const poolData = await poolResponse.json();
    return poolData.strategies || [];
  } catch (error) {
    console.error('Error fetching strategies from pools:', error);
    return [];
  }
}

// Function to merge strategies from different sources, avoiding duplicates
function mergeStrategies(baseStrategies: Strategy[], newStrategies: Strategy[]): Strategy[] {
  // Create a map of existing strategy IDs
  const existingIds = new Set(baseStrategies.map(s => s.id));

  // Add new strategies that don't exist in the base set
  const combinedStrategies = [...baseStrategies];

  for (const strategy of newStrategies) {
    if (!existingIds.has(strategy.id)) {
      combinedStrategies.push(strategy);
    }
  }

  return combinedStrategies;
}

async function fetchPortfolioFromGnosis(address: string): Promise<Portfolio> {
  try {
    // Use the normalized address
    const checksumAddress = getAddress(address);

    // Fetch portfolio data from the get-portfolio endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const portfolioUrl = apiUrl
      ? `${apiUrl}/api/pilot/get-portfolio?address=${checksumAddress}`
      : `/api/pilot/get-portfolio?address=${checksumAddress}`;

    const portfolioResponse = await fetch(new URL(portfolioUrl, 'http://localhost:3000'));

    if (!portfolioResponse.ok) {
      throw new Error(`Failed to fetch portfolio: ${portfolioResponse.statusText}`);
    }

    const portfolioData = await portfolioResponse.json();
    return portfolioData.portfolio;
  } catch (error) {
    console.error('Error in fetchPortfolioFromGnosis:', error);
    throw error;
  }
}

async function getStrategiesForRiskProfile(riskProfile: string): Promise<Strategy[]> {
  try {
    // Fetch strategies from the get-strategies endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const strategiesUrl = apiUrl
      ? `${apiUrl}/api/pilot/get-strategies?riskLevel=${riskProfile}`
      : `/api/pilot/get-strategies?riskLevel=${riskProfile}`;

    const strategiesResponse = await fetch(new URL(strategiesUrl, 'http://localhost:3000'));

    if (!strategiesResponse.ok) {
      throw new Error(`Failed to fetch strategies: ${strategiesResponse.statusText}`);
    }

    const strategiesData = await strategiesResponse.json();

    // If there's an issue with the API, use the fallback data
    if (!strategiesData.strategies || strategiesData.strategies.length === 0) {
      return get2025StrategiesForRiskProfile(riskProfile);
    }

    return strategiesData.strategies;
  } catch (error) {
    console.error('Error fetching strategies:', error);
    // Use fallback data if API fails
    return get2025StrategiesForRiskProfile(riskProfile);
  }
}

// Fallback function for 2025 strategies if API fails
function get2025StrategiesForRiskProfile(riskProfile: string): Strategy[] {
  // Updated 2025 strategies - Curve no longer has xDAI pools
  const allStrategies: Strategy[] = [
    {
      id: 'asyc-xdai',
      name: 'Asyc xDAI Lending',
      protocol: 'Asyc Finance',
      asset: 'xDAI',
      type: 'Lending',
      description: 'Deposit xDAI on Asyc to earn interest with variable APY',
      apy: '7.5%',
      riskLevel: 'low',
      tvl: '$24.3M',
      network: 'gnosis'
    },
    {
      id: 'gnosis-dao-staking',
      name: 'Gnosis DAO Staking',
      protocol: 'Gnosis DAO',
      asset: 'GNO',
      type: 'Staking',
      description: 'Stake GNO tokens to earn protocol fees and governance rights',
      apy: '9.8%',
      riskLevel: 'low',
      tvl: '$65.1M',
      network: 'gnosis'
    },
    {
      id: 'zenith-stables',
      name: 'Zenith Stableswap',
      protocol: 'Zenith',
      asset: 'xDAI-USDC',
      type: 'Stable Swap',
      description: 'Provide liquidity to xDAI-USDC pool on Zenith',
      apy: '5.6%',
      riskLevel: 'low',
      tvl: '$42.8M',
      network: 'gnosis'
    },
    {
      id: 'cosmos-gno-xdai',
      name: 'CosmosSwap GNO-xDAI LP',
      protocol: 'CosmosSwap',
      asset: 'GNO-xDAI',
      type: 'Liquidity Providing',
      description: 'Provide liquidity for GNO-xDAI pair on CosmosSwap with auto-compounding',
      apy: '18.4%',
      riskLevel: 'medium',
      tvl: '$12.5M',
      network: 'gnosis'
    },
    {
      id: 'nexus-gnosafe',
      name: 'Nexus GnoSafe Yield',
      protocol: 'Nexus',
      asset: 'WXDAI',
      type: 'Yield Aggregator',
      description: 'Auto-optimizing yield strategy for wrapped xDAI across multiple protocols',
      apy: '12.2%',
      riskLevel: 'medium',
      tvl: '$31.7M',
      network: 'gnosis'
    },
    {
      id: 'quantum-options',
      name: 'Quantum Options Vault',
      protocol: 'Quantum Finance',
      asset: 'GNO',
      type: 'Structured Product',
      description: 'GNO covered call strategy generating yield from options premiums',
      apy: '22.5%',
      riskLevel: 'medium',
      tvl: '$8.9M',
      network: 'gnosis'
    },
    {
      id: 'forge-gno-eth',
      name: 'Forge GNO-ETH LP',
      protocol: 'Forge',
      asset: 'GNO-ETH',
      type: 'Concentrated Liquidity',
      description: 'Concentrated liquidity position for GNO-ETH with active range management',
      apy: '28.7%',
      riskLevel: 'high',
      tvl: '$6.2M',
      network: 'gnosis'
    },
    {
      id: 'nova-delta-neutral',
      name: 'Nova Delta-Neutral Strategy',
      protocol: 'Nova Finance',
      asset: 'GNO-USDC',
      type: 'Delta-Neutral Farming',
      description: 'Market-neutral yield strategy using leveraged positions',
      apy: '32.4%',
      riskLevel: 'high',
      tvl: '$4.1M',
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

async function generateOptimizedAllocation(
  portfolio: Portfolio,
  strategies: Strategy[],
  riskProfile: string,
  investmentAmount?: number
) {
  // Total available for allocation
  const totalAvailable = investmentAmount || Number.parseFloat(portfolio.totalValueUSD);

  // Use modern portfolio theory for optimization
  const optimizedPortfolio = await optimizePortfolio(strategies, riskProfile, totalAvailable);

  return {
    riskProfile,
    totalInvestment: totalAvailable.toFixed(2),
    expectedAnnualYield: optimizedPortfolio.expectedYield.toFixed(2),
    recommendations: optimizedPortfolio.allocations
  };
}

// Mean-Variance Optimization (Modern Portfolio Theory implementation)
async function optimizePortfolio(
  strategies: Strategy[],
  riskProfile: string,
  totalInvestment: number
) {
  // Convert APYs to decimal
  const returns = strategies.map(s => Number.parseFloat(s.apy.replace('%', '')) / 100);

  // Covariance matrix - in real implementation this would be calculated from historical data
  // For now we'll use a simplified approach based on risk levels
  const riskLevelToVolatility = {
    'low': 0.05,
    'medium': 0.15,
    'high': 0.30
  };

  // Risk tolerance parameter based on user profile
  const riskToleranceParameter = {
    'low': 2,
    'medium': 5,
    'high': 10
  }[riskProfile] || 5;

  // Calculate volatilities based on risk levels
  const volatilities = strategies.map(s => riskLevelToVolatility[s.riskLevel as 'low' | 'medium' | 'high']);

  // Calculate weights using a simplified optimization approach
  // For a full implementation, we would use quadratic programming
  let weights = calculateOptimalWeights(returns, volatilities, riskToleranceParameter);

  // Adjust weights based on risk profile constraints
  weights = adjustWeightsForRiskProfile(weights, strategies, riskProfile);

  // Normalize weights to sum to 1
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  weights = weights.map(w => w / sumWeights);

  // Calculate expected yield
  const expectedYield = weights.reduce((sum, weight, i) => sum + weight * returns[i], 0) * 100;

  // Create the allocations
  const allocations = strategies.map((strategy, i) => {
    const allocationPercent = weights[i] * 100;
    const allocationAmount = totalInvestment * weights[i];

    return {
      ...strategy,
      recommendedAllocation: {
        percent: allocationPercent,
        amount: allocationAmount.toFixed(2)
      }
    };
  }).filter(s => s.recommendedAllocation && s.recommendedAllocation.percent > 0.5); // Only include strategies with > 0.5% allocation

  return {
    allocations,
    expectedYield
  };
}

function calculateOptimalWeights(returns: number[], volatilities: number[], riskTolerance: number) {
  // Simple implementation that allocates based on risk-adjusted returns
  // In a production environment, this would use a proper optimization algorithm

  // Calculate Sharpe ratio for each asset (simplified without risk-free rate)
  const sharpeRatios = returns.map((ret, i) => ret / volatilities[i]);

  // Preliminary weights based on Sharpe ratios
  const prelimWeights = sharpeRatios.map(sharpe => Math.max(0, sharpe));

  // Normalize preliminary weights
  const sumPrelimWeights = prelimWeights.reduce((a, b) => a + b, 0);
  const weights = prelimWeights.map(w => w / sumPrelimWeights);

  // Adjust weights based on risk tolerance
  // Higher risk tolerance → more weight to higher return assets
  if (riskTolerance > 5) {
    // For higher risk tolerance, shift more weight to higher return assets
    const returnRankings = returns.map((ret, i) => ({ ret, i }))
      .sort((a, b) => b.ret - a.ret)
      .map(item => item.i);

    // Shift some weight to higher return assets
    const shiftFactor = (riskTolerance - 5) / 10; // 0.0 to 0.5
    for (let i = 0; i < Math.min(3, returnRankings.length); i++) {
      const idx = returnRankings[i];
      const boost = shiftFactor * (0.3 - (i * 0.1)); // Decreasing boost for top 3
      weights[idx] += boost;
    }
  } else if (riskTolerance < 5) {
    // For lower risk tolerance, shift more weight to lower volatility assets
    const volatilityRankings = volatilities.map((vol, i) => ({ vol, i }))
      .sort((a, b) => a.vol - b.vol)
      .map(item => item.i);

    // Shift some weight to lower volatility assets
    const shiftFactor = (5 - riskTolerance) / 10; // 0.0 to 0.5
    for (let i = 0; i < Math.min(3, volatilityRankings.length); i++) {
      const idx = volatilityRankings[i];
      const boost = shiftFactor * (0.3 - (i * 0.1)); // Decreasing boost for top 3
      weights[idx] += boost;
    }
  }

  // Normalize weights again
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sumWeights);
}

function adjustWeightsForRiskProfile(
  weights: number[],
  strategies: Strategy[],
  riskProfile: string
) {
  // Apply constraints based on risk profile
  const adjustedWeights = [...weights];

  // For low risk profile, reduce high-risk allocations
  if (riskProfile === 'low') {
    for (let i = 0; i < strategies.length; i++) {
      if (strategies[i].riskLevel === 'high') {
        adjustedWeights[i] = 0; // Zero out high risk investments
      }
      if (strategies[i].riskLevel === 'medium') {
        adjustedWeights[i] = adjustedWeights[i] * 0.5; // Reduce medium risk investments
      }
    }
  }

  // For medium risk profile, cap high-risk allocations
  if (riskProfile === 'medium') {
    let totalHighRisk = 0;
    for (let i = 0; i < strategies.length; i++) {
      if (strategies[i].riskLevel === 'high') {
        totalHighRisk += adjustedWeights[i];
      }
    }

    // If total high risk allocation exceeds 20%, scale it down
    if (totalHighRisk > 0.2) {
      const scaleFactor = 0.2 / totalHighRisk;
      for (let i = 0; i < strategies.length; i++) {
        if (strategies[i].riskLevel === 'high') {
          adjustedWeights[i] = adjustedWeights[i] * scaleFactor;
        }
      }
    }
  }

  // Normalize weights
  const sumWeights = adjustedWeights.reduce((a, b) => a + b, 0);
  if (sumWeights > 0) {
    return adjustedWeights.map(w => w / sumWeights);
  }

  // Fallback if all weights were zeroed out
  return weights;
}