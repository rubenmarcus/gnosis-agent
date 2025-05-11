import { NextResponse } from 'next/server';
import { getDefiLlamaStrategies } from '../get-strategies/route';
import { parseEther, encodeFunctionData, Address } from 'viem';
import {
  PROTOCOL_ROUTERS,
  BALANCER_VAULT,
  POOL_IDS,
  NATIVE_TOKEN_ADDRESS,
  ZERO_ADDRESS,
  WXDAI_ADDRESS,
  MAX_APPROVAL
} from '@/app/config/contracts';

// Simple ABI definitions for common operations
const APPROVE_ABI = {
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'nonpayable',
};

const DEPOSIT_ABI = {
  name: 'deposit',
  type: 'function',
  inputs: [
    { name: 'asset', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'onBehalfOf', type: 'address' },
    { name: 'referralCode', type: 'uint16' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
};

const SUPPLY_ABI = {
  name: 'supply',
  type: 'function',
  inputs: [
    { name: 'asset', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'onBehalfOf', type: 'address' },
    { name: 'referralCode', type: 'uint16' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
};

const STAKE_ABI = {
  name: 'stake',
  type: 'function',
  inputs: [
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
};

// Interface for Safe transaction formatting
interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  operation: number;
}

// Interface for our response
interface ExecuteStrategyResponse {
  signRequest: {
    safeTransactionData: SafeTransaction[];
    safeTxGas?: number;
    chainId: number;
  };
  message: string;
  meta?: {
    strategyId: string;
    protocol: string;
    type: string;
  };
}

// Check if token is a native token representation
function isNativeTokenAddress(address: string): boolean {
  const lowerAddress = address.toLowerCase();
  return lowerAddress === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
         lowerAddress === ZERO_ADDRESS.toLowerCase();
}

// Helper to create approval transaction
function createApprovalTransaction(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
): SafeTransaction {
  const txData = encodeFunctionData({
    abi: [APPROVE_ABI],
    functionName: 'approve',
    args: [spenderAddress as `0x${string}`, amount]
  });

  return {
    to: tokenAddress,
    data: txData,
    value: '0',
    operation: 0, // Call operation
  };
}

// Generate transaction data based on strategy and amount
async function generateTransactionData(
  strategyId: string,
  amount: string,
  userAddress: string,
  action = 'enter'
): Promise<ExecuteStrategyResponse | null> {
  try {
    // Get strategies from DeFiLlama
    const strategies = await getDefiLlamaStrategies();

    // Find the selected strategy
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Ensure the strategy has underlying tokens
    if (!strategy.underlyingTokens || strategy.underlyingTokens.length === 0) {
      throw new Error(`Strategy ${strategyId} has no underlying tokens defined`);
    }

    // Get the first token address (primary token for the strategy)
    const tokenAddress = strategy.underlyingTokens[0];

    // Validate the token address is not a placeholder or zero address
    if (!tokenAddress) {
      throw new Error(`Invalid token address for strategy ${strategyId}`);
    }

    // Get the router address for the protocol
    const protocolKey = strategy.protocol.toLowerCase();
    const routerAddress = PROTOCOL_ROUTERS[protocolKey];
    if (!routerAddress) {
      throw new Error(`Router address not available for ${strategy.protocol}`);
    }

    // The actual target address for the transaction (may differ from router for some protocols)
    const targetAddress = routerAddress;

    // Create Safe transactions array
    const safeTransactions: SafeTransaction[] = [];

    // Convert amount to wei
    const amountInWei = parseEther(amount);

    // Check if the strategy involves native token (xDAI)
    const isNativeToken = isNativeTokenAddress(tokenAddress);

    // Process based on strategy type
    if (strategy.type === 'Lending') {
      if (protocolKey === 'agave') {
        // Add approval if needed
        if (!isNativeToken) {
          safeTransactions.push(createApprovalTransaction(
            tokenAddress,
            routerAddress,
            MAX_APPROVAL
          ));
        }

        // Add deposit transaction
        const depositData = encodeFunctionData({
          abi: [DEPOSIT_ABI],
          functionName: 'deposit',
          args: [
            isNativeToken ? WXDAI_ADDRESS as `0x${string}` : tokenAddress as `0x${string}`,
            amountInWei,
            userAddress as `0x${string}`,
            0 // referral code
          ]
        });

        safeTransactions.push({
          to: routerAddress,
          data: depositData,
          value: isNativeToken ? amountInWei.toString() : '0',
          operation: 0, // Call operation
        });
      } else {
        // Add approval if needed
        if (!isNativeToken) {
          safeTransactions.push(createApprovalTransaction(
            tokenAddress,
            routerAddress,
            MAX_APPROVAL
          ));
        }

        // Add supply transaction
        const supplyData = encodeFunctionData({
          abi: [SUPPLY_ABI],
          functionName: 'supply',
          args: [
            isNativeToken ? WXDAI_ADDRESS as `0x${string}` : tokenAddress as `0x${string}`,
            amountInWei,
            userAddress as `0x${string}`,
            0 // referral code
          ]
        });

        safeTransactions.push({
          to: routerAddress,
          data: supplyData,
          value: isNativeToken ? amountInWei.toString() : '0',
          operation: 0, // Call operation
        });
      }
    } else if (strategy.type === 'Staking') {
      // Add approval if needed
      if (!isNativeToken) {
        safeTransactions.push(createApprovalTransaction(
          tokenAddress,
          targetAddress,
          MAX_APPROVAL
        ));
      }

      // Add stake transaction
      const stakeData = encodeFunctionData({
        abi: [STAKE_ABI],
        functionName: 'stake',
        args: [amountInWei]
      });

      safeTransactions.push({
        to: targetAddress,
        data: stakeData,
        value: isNativeToken ? amountInWei.toString() : '0',
        operation: 0, // Call operation
      });
    } else {
      // For other strategies, we'll need to implement more specific logic
      // This is a simplified example
      if (!isNativeToken) {
        safeTransactions.push(createApprovalTransaction(
          tokenAddress,
          targetAddress,
          MAX_APPROVAL
        ));
      }

      console.log(`Strategy type ${strategy.type} implementation simplified`);
    }

    // Prepare the response with Safe format
    return {
      signRequest: {
        safeTransactionData: safeTransactions,
        chainId: 100, // Gnosis Chain
      },
      message: `Transaction data generated successfully for ${strategy.name}`,
      meta: {
        strategyId,
        protocol: strategy.protocol,
        type: strategy.type
      }
    };
  } catch (error) {
    console.error('Error generating transaction data:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { strategyId, amount, userAddress, action } = body;

    // Validate required parameters
    if (!strategyId || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: strategyId, amount, and userAddress are required' },
        { status: 400 }
      );
    }

    // Generate transaction data
    const txResponse = await generateTransactionData(strategyId, amount, userAddress, action);

    if (!txResponse) {
      return NextResponse.json(
        { error: 'Failed to generate transaction data for the selected strategy' },
        { status: 500 }
      );
    }

    return NextResponse.json(txResponse);
  } catch (error) {
    console.error('Error executing strategy:', error);
    return NextResponse.json(
      { error: 'Failed to execute strategy' },
      { status: 500 }
    );
  }
}