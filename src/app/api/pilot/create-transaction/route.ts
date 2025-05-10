import { NextResponse } from 'next/server';

// Define interfaces for better type safety
interface Strategy {
  id: string;
  protocol: string;
  asset: string;
  contractAddress: string;
  decimals: number;
  type: string;
  token0?: string;
  token1?: string;
}

interface TransactionPayload {
  to: string;
  from: string;
  value: string;
  data: string;
  chainId: number;
}

// Mock contract addresses for different protocols on Gnosis Chain
const PROTOCOL_CONTRACTS = {
  'agave': '0x5E15d5E33d318dCEd84Bfe3F4EACe07909bE6d99',
  'honeyswap': '0x1C232F01118CB8B424793ae03F870aa7D0ac7f77',
  'curve': '0xabCdef1234567890abCdef1234567890abCdef12',
  'bao-finance': '0x7890abCdef1234567890abCdef1234567890abC',
  'symmetric': '0x1234567890abCdef1234567890abCdef12345678'
};

// Mock ABIs for different action types
const ACTION_METHODS = {
  'deposit': 'deposit(uint256)',
  'withdraw': 'withdraw(uint256)',
  'addLiquidity': 'addLiquidity(address,address,uint256,uint256,uint256,uint256)',
  'removeLiquidity': 'removeLiquidity(address,address,uint256,uint256,uint256)',
  'stake': 'stake(uint256)',
  'unstake': 'unstake(uint256)'
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId');
    const action = searchParams.get('action'); // deposit, withdraw, addLiquidity, removeLiquidity, stake, unstake
    const amount = searchParams.get('amount');
    const userAddress = searchParams.get('userAddress');

    if (!strategyId || !action || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: strategyId, action, amount, and userAddress are required' },
        { status: 400 }
      );
    }

    // Fetch strategy details to determine contract addresses and methods
    const strategyDetails = await getStrategyInfo(strategyId);

    if (!strategyDetails) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // Generate the transaction payload
    const txPayload = await createTransactionPayload(
      strategyDetails,
      action,
      amount,
      userAddress
    );

    return NextResponse.json({
      transactionPayload: txPayload
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction payload' },
      { status: 500 }
    );
  }
}

// Mock function to get strategy information
async function getStrategyInfo(strategyId: string): Promise<Strategy | undefined> {
  // In a real application, this would fetch from a database
  const strategies: Record<string, Strategy> = {
    'agave-xdai': {
      id: 'agave-xdai',
      protocol: 'agave',
      asset: 'xDAI',
      contractAddress: PROTOCOL_CONTRACTS.agave,
      decimals: 18,
      type: 'lending'
    },
    'honeyswap-gno-xdai': {
      id: 'honeyswap-gno-xdai',
      protocol: 'honeyswap',
      asset: 'GNO-xDAI',
      contractAddress: PROTOCOL_CONTRACTS.honeyswap,
      decimals: 18,
      token0: '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb', // GNO
      token1: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d', // WXDAI
      type: 'liquidity'
    },
    'curve-xdai-usdc': {
      id: 'curve-xdai-usdc',
      protocol: 'curve',
      asset: 'xDAI-USDC',
      contractAddress: PROTOCOL_CONTRACTS.curve,
      decimals: 18,
      type: 'stable-swap'
    },
    'bao-finance-vaults': {
      id: 'bao-finance-vaults',
      protocol: 'bao-finance',
      asset: 'GNO-ETH',
      contractAddress: PROTOCOL_CONTRACTS['bao-finance'],
      decimals: 18,
      type: 'yield-farming'
    }
  };

  return strategies[strategyId];
}

// Creates a transaction payload based on strategy and action
async function createTransactionPayload(
  strategy: Strategy,
  action: string,
  amount: string,
  userAddress: string
): Promise<TransactionPayload> {
  // Convert amount to Wei (multiply by 10^decimals)
  const amountInWei = calculateAmountInWei(amount, strategy.decimals);

  // For simplicity, we'll handle a few common cases
  if (strategy.type === 'lending') {
    // Handle lending protocol actions (Agave)
    if (action === 'deposit') {
      return createDepositPayload(strategy, amountInWei, userAddress);
    } else if (action === 'withdraw') {
      return createWithdrawPayload(strategy, amountInWei, userAddress);
    }
  } else if (strategy.type === 'liquidity') {
    // Handle liquidity providing actions (Honeyswap)
    if (action === 'addLiquidity') {
      return createAddLiquidityPayload(strategy, amountInWei, userAddress);
    } else if (action === 'removeLiquidity') {
      return createRemoveLiquidityPayload(strategy, amountInWei, userAddress);
    }
  } else if (strategy.type === 'stable-swap') {
    // Handle stable swap actions (Curve)
    if (action === 'deposit') {
      return createStableDepositPayload(strategy, amountInWei, userAddress);
    } else if (action === 'withdraw') {
      return createStableWithdrawPayload(strategy, amountInWei, userAddress);
    }
  } else if (strategy.type === 'yield-farming') {
    // Handle yield farming actions (Bao Finance)
    if (action === 'stake') {
      return createStakePayload(strategy, amountInWei, userAddress);
    } else if (action === 'unstake') {
      return createUnstakePayload(strategy, amountInWei, userAddress);
    }
  }

  throw new Error(`Unsupported action "${action}" for strategy type "${strategy.type}"`);
}

// Helper functions to create specific transaction payloads
function createDepositPayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // This is a mock implementation - in a real app, you'd use a proper ABI encoder
  const data = `0x${ACTION_METHODS.deposit.slice(0, 8)}${padAmount(amountInWei)}`;

  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: amountInWei, // For native token deposits
    data,
    chainId: 100, // Gnosis Chain ID
  };
}

function createWithdrawPayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // This is a mock implementation - in a real app, you'd use a proper ABI encoder
  const data = `0x${ACTION_METHODS.withdraw.slice(0, 8)}${padAmount(amountInWei)}`;

  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0', // No value for withdrawals
    data,
    chainId: 100, // Gnosis Chain ID
  };
}

function createAddLiquidityPayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // In a real app, you'd calculate proper minimum amounts and deadlines
  // This is a simplified version
  const token0 = strategy.token0;
  const token1 = strategy.token1;
  const amount0 = amountInWei;
  const amount1 = amountInWei; // In a real app, you'd calculate this based on price
  const minAmount0 = '0'; // In a real app, would be calculated with slippage
  const minAmount1 = '0'; // In a real app, would be calculated with slippage

  // This is a mock implementation - in a real app, you'd use a proper ABI encoder
  const data = `0x${ACTION_METHODS.addLiquidity.slice(0, 8)}`;

  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0', // Would need to be set for native token
    data,
    chainId: 100, // Gnosis Chain ID
  };
}

function createRemoveLiquidityPayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // In a real app, you'd calculate proper minimum amounts and deadlines
  const token0 = strategy.token0;
  const token1 = strategy.token1;
  const lpAmount = amountInWei;
  const minAmount0 = '0'; // In a real app, would be calculated with slippage
  const minAmount1 = '0'; // In a real app, would be calculated with slippage

  // This is a mock implementation - in a real app, you'd use a proper ABI encoder
  const data = `0x${ACTION_METHODS.removeLiquidity.slice(0, 8)}`;

  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0',
    data,
    chainId: 100, // Gnosis Chain ID
  };
}

// Other payload creation functions would be implemented here
function createStableDepositPayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // Mock implementation
  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0',
    data: `0x${ACTION_METHODS.deposit.slice(0, 8)}${padAmount(amountInWei)}`,
    chainId: 100,
  };
}

function createStableWithdrawPayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // Mock implementation
  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0',
    data: `0x${ACTION_METHODS.withdraw.slice(0, 8)}${padAmount(amountInWei)}`,
    chainId: 100,
  };
}

function createStakePayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // Mock implementation
  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0',
    data: `0x${ACTION_METHODS.stake.slice(0, 8)}${padAmount(amountInWei)}`,
    chainId: 100,
  };
}

function createUnstakePayload(strategy: Strategy, amountInWei: string, userAddress: string): TransactionPayload {
  // Mock implementation
  return {
    to: strategy.contractAddress,
    from: userAddress,
    value: '0',
    data: `0x${ACTION_METHODS.unstake.slice(0, 8)}${padAmount(amountInWei)}`,
    chainId: 100,
  };
}

// Helper functions
function calculateAmountInWei(amount: string, decimals: number): string {
  // Convert decimal amount to wei
  // For simplicity, we're just appending zeros here
  // In a real app, you'd use a proper BigNumber library
  const amountFloat = Number.parseFloat(amount);
  const amountWei = Math.round(amountFloat * 10**decimals).toString();
  return amountWei;
}

function padAmount(amount: string): string {
  // Pad the hex amount to 32 bytes for ABI encoding
  // This is a very simplified version - use proper ABI encoding in production
  return amount.padStart(64, '0');
}