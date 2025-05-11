import { NextResponse } from 'next/server';
import { parseEther, encodeFunctionData, toHex } from 'viem';
import { getDefiLlamaStrategies } from '../get-strategies/route';
import {
  PROTOCOL_ROUTERS,
  BALANCER_VAULT,
  NATIVE_TOKEN_ADDRESS,
  ZERO_ADDRESS,
  WXDAI_ADDRESS,
  MAX_APPROVAL
} from '@/app/config/contracts';

// ABI definitions for different functions
const FUNCTION_ABIS = {
  // SushiSwap/Uniswap style router functions
  addLiquidity: {
    name: 'addLiquidity',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },

  addLiquidityETH: {
    name: 'addLiquidityETH',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amountTokenDesired', type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },

  // Lending/Borrowing functions (Aave/Agave style)
  lend: {
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
  },

  // Agave deposit function (corrected ABI)
  agaveDeposit: {
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
  },

  borrow: {
    name: 'borrow',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
      { name: 'referralCode', type: 'uint16' },
      { name: 'onBehalfOf', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Staking functions (common across protocols)
  stake: {
    name: 'stake',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Curve style deposit (for stable pools)
  curveDeposit: {
    name: 'add_liquidity',
    type: 'function',
    inputs: [
      { name: 'amounts', type: 'uint256[4]' },
      { name: 'min_mint_amount', type: 'uint256' },
    ],
    outputs: [
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },

  // Balancer style join pool
  balancerJoin: {
    name: 'joinPool',
    type: 'function',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'joinPoolRequest', type: 'tuple',
        components: [
          { name: 'assets', type: 'address[]' },
          { name: 'maxAmountsIn', type: 'uint256[]' },
          { name: 'userData', type: 'bytes' },
          { name: 'fromInternalBalance', type: 'bool' },
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Basic ERC20 deposit function
  deposit: {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Trading functions
  swapExactTokensForTokens: {
    name: 'swapExactTokensForTokens',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },

  swapExactETHForTokens: {
    name: 'swapExactETHForTokens',
    type: 'function',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'payable',
  },

  // ERC20 approve function
  approve: {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: '', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },

  // Balancer style join pool (with ETH)
  balancerJoinETH: {
    name: 'joinPoolETH',
    type: 'function',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'joinPoolRequest', type: 'tuple',
        components: [
          { name: 'assets', type: 'address[]' },
          { name: 'maxAmountsIn', type: 'uint256[]' },
          { name: 'userData', type: 'bytes' },
          { name: 'fromInternalBalance', type: 'bool' },
        ]
      }
    ],
    outputs: [],
    stateMutability: 'payable',
  },
};

// Interface for Safe transaction formatting
interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  operation: number;
}

// Interface for transaction payload response
interface TransactionPayload {
  to: string;
  from: string;
  value: string;
  data: string;
  chainId: number;
}

// Interface for our Safe response
interface CreateTransactionResponse {
  signRequest: {
    safeTransactionData: SafeTransaction[];
    safeTxGas?: number;
    chainId: number;
  };
  message: string;
  meta?: {
    strategyId: string;
    protocol: string;
    action: string;
  };
  transactionPayload?: TransactionPayload;
}

// Helper to create approval transaction
function createApprovalTransaction(
  tokenAddress: string,
  spenderAddress: string,
  userAddress: string
): SafeTransaction {
  const txData = encodeFunctionData({
    abi: [FUNCTION_ABIS.approve],
    functionName: 'approve',
    args: [spenderAddress as `0x${string}`, MAX_APPROVAL]
  });

  return {
    to: tokenAddress,
    data: txData,
    value: '0',
    operation: 0, // Call operation
  };
}

// Check if token is a native token representation
function isNativeTokenAddress(address: string): boolean {
  const lowerAddress = address.toLowerCase();
  return lowerAddress === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
         lowerAddress === ZERO_ADDRESS.toLowerCase();
}

// Generate transaction data based on strategy and amount
async function generateTransactionData(
  strategyId: string,
  action: string,
  amount: string,
  userAddress: string
): Promise<CreateTransactionResponse | null> {
  try {
    // Get strategies from DeFiLlama
    const strategies = await getDefiLlamaStrategies();

    // Find the specific strategy
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error(`Strategy with ID ${strategyId} not found`);
    }

    // Map action to the appropriate function
    const mappedAction = mapActionToFunction(action, strategy.type);

    // Get token address from strategy (assuming first token in underlying tokens)
    const tokenAddress = strategy.underlyingTokens && strategy.underlyingTokens.length > 0
      ? strategy.underlyingTokens[0]
      : '0x0000000000000000000000000000000000000000';

    // Validate the token address is not zero
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
    let targetAddress = routerAddress;

    // Convert amount to wei format (hex string)
    const amountInWei = parseEther(amount);

    // Check if the strategy involves native token (xDAI)
    const isNativeToken = isNativeTokenAddress(tokenAddress);

    // Determine if we need approval and set up transaction data
    let txData: string;
    let requiresApproval = false;

    // Create Safe transactions array
    const safeTransactions: SafeTransaction[] = [];

    // Generate transaction data based on action and strategy type
    if (mappedAction === 'supply' || action === 'deposit' || action === 'enter') {
      // For lending or deposit actions
      requiresApproval = !isNativeToken; // Only require approval for non-native tokens

      if (protocolKey === 'agave') {
        // Use specific Agave deposit function with correct ABI
        if (requiresApproval) {
          safeTransactions.push(createApprovalTransaction(
            tokenAddress,
            targetAddress,
            userAddress
          ));
        }

        txData = encodeFunctionData({
          abi: [FUNCTION_ABIS.agaveDeposit],
          functionName: 'deposit',
          args: [
            isNativeToken ? WXDAI_ADDRESS as `0x${string}` : tokenAddress as `0x${string}`,
            amountInWei,
            userAddress as `0x${string}`,
            0 // referral code
          ]
        });

        safeTransactions.push({
          to: targetAddress,
          data: txData,
          value: isNativeToken ? amountInWei.toString() : '0',
          operation: 0, // Call operation
        });
      } else {
        if (requiresApproval) {
          safeTransactions.push(createApprovalTransaction(
            tokenAddress,
            targetAddress,
            userAddress
          ));
        }

        txData = encodeFunctionData({
          abi: [FUNCTION_ABIS.lend],
          functionName: 'supply',
          args: [
            isNativeToken ? WXDAI_ADDRESS as `0x${string}` : tokenAddress as `0x${string}`,
            amountInWei,
            userAddress as `0x${string}`,
            0 // referral code
          ]
        });

        safeTransactions.push({
          to: targetAddress,
          data: txData,
          value: isNativeToken ? amountInWei.toString() : '0',
          operation: 0, // Call operation
        });
      }
    } else if (mappedAction === 'addLiquidity' || action === 'addLiquidity') {
      // For liquidity providing actions
      requiresApproval = !isNativeToken;

      // Handle Balancer/Aura protocols
      if (protocolKey === 'aura' || protocolKey === 'balancer') {
        // Balancer-style protocols need the Balancer Vault as target
        targetAddress = BALANCER_VAULT;

        // To do - implement Balancer pool joining specific to this createTransaction route
        // For now using a placeholder that will throw an appropriate error
        throw new Error('Balancer/Aura pool joining not yet implemented in this endpoint. Use execute-strategy instead');
      }

      // Handle Curve protocols
      if (protocolKey === 'curve') {
        // For Curve-style pools
        if (requiresApproval) {
          safeTransactions.push(createApprovalTransaction(
            tokenAddress,
            routerAddress,
            userAddress
          ));
        }

        txData = encodeFunctionData({
          abi: [FUNCTION_ABIS.curveDeposit],
          functionName: 'add_liquidity',
          args: [
            [amountInWei, BigInt(0), BigInt(0), BigInt(0)], // amounts array (first token only)
            BigInt(0) // min_mint_amount
          ]
        });

        safeTransactions.push({
          to: targetAddress,
          data: txData,
          value: isNativeToken ? amountInWei.toString() : '0',
          operation: 0, // Call operation
        });
      } else { // Handle other DEXes (Uniswap/Sushiswap/Honeyswap style pools)
        // Get the second token for the pair
        if (!strategy.underlyingTokens || strategy.underlyingTokens.length < 2) {
          throw new Error(`Liquidity providing strategy ${strategyId} requires at least 2 tokens`);
        }

        const tokenB = strategy.underlyingTokens[1];

        // Validate the second token address
        if (!tokenB) {
          throw new Error(`Invalid second token address for strategy ${strategyId}`);
        }

        // Check if one of the tokens is the native token
        const tokenBIsNative = isNativeTokenAddress(tokenB);

        // Add approvals if needed
        if (!isNativeToken) {
          safeTransactions.push(createApprovalTransaction(
            tokenAddress,
            routerAddress,
            userAddress
          ));
        }

        if (!tokenBIsNative && !isNativeToken) {
          safeTransactions.push(createApprovalTransaction(
            tokenB,
            routerAddress,
            userAddress
          ));
        }

        if (isNativeToken || tokenBIsNative) {
          // Use addLiquidityETH for native token pairs
          txData = encodeFunctionData({
            abi: [FUNCTION_ABIS.addLiquidityETH],
            functionName: 'addLiquidityETH',
            args: [
              isNativeToken ? tokenB as `0x${string}` : tokenAddress as `0x${string}`,
              amountInWei,                           // amountToken
              BigInt(0),                             // amountTokenMin
              BigInt(0),                             // amountETHMin
              userAddress as `0x${string}`,          // to
              BigInt(Math.floor(Date.now() / 1000) + 3600)  // deadline (1 hour)
            ]
          });

          safeTransactions.push({
            to: targetAddress,
            data: txData,
            value: isNativeToken ? amountInWei.toString() : '0',
            operation: 0, // Call operation
          });
        } else {
          // Use standard addLiquidity for token pairs
          txData = encodeFunctionData({
            abi: [FUNCTION_ABIS.addLiquidity],
            functionName: 'addLiquidity',
            args: [
              tokenAddress as `0x${string}`,
              tokenB as `0x${string}`,
              amountInWei,                           // amountA
              amountInWei,                           // amountB
              BigInt(0),                             // minAmountA
              BigInt(0),                             // minAmountB
              userAddress as `0x${string}`,          // to
              BigInt(Math.floor(Date.now() / 1000) + 3600)  // deadline (1 hour)
            ]
          });

          safeTransactions.push({
            to: targetAddress,
            data: txData,
            value: '0',
            operation: 0, // Call operation
          });
        }
      }
    } else if (mappedAction === 'stake' || action === 'stake') {
      // For staking actions
      requiresApproval = !isNativeToken;

      if (requiresApproval) {
        safeTransactions.push(createApprovalTransaction(
          tokenAddress,
          targetAddress,
          userAddress
        ));
      }

      txData = encodeFunctionData({
        abi: [FUNCTION_ABIS.stake],
        functionName: 'stake',
        args: [amountInWei]
      });

      safeTransactions.push({
        to: targetAddress,
        data: txData,
        value: isNativeToken ? amountInWei.toString() : '0',
        operation: 0, // Call operation
      });
    } else {
      // Default deposit function for other types
      requiresApproval = !isNativeToken;

      if (requiresApproval) {
        safeTransactions.push(createApprovalTransaction(
          tokenAddress,
          targetAddress,
          userAddress
        ));
      }

      txData = encodeFunctionData({
        abi: [FUNCTION_ABIS.deposit],
        functionName: 'deposit',
        args: [amountInWei]
      });

      safeTransactions.push({
        to: targetAddress,
        data: txData,
        value: isNativeToken ? amountInWei.toString() : '0',
        operation: 0, // Call operation
      });
    }

    // Build the transaction payload for legacy support
    const mainTransaction = {
      to: targetAddress,
      data: txData,
      value: isNativeToken ? toHex(amountInWei) : '0x0',
      from: userAddress
    };

    // Log the transaction for debugging
    console.log("Generated Safe Tx:", safeTransactions);

    // Return both Safe format and legacy format
    return {
      signRequest: {
        safeTransactionData: safeTransactions,
        chainId: 100 // Gnosis Chain
      },
      message: `Created transaction for ${strategy.protocol} ${action} operation`,
      meta: {
        strategyId,
        protocol: strategy.protocol,
        action
      },
      transactionPayload: {
        to: mainTransaction.to,
        from: mainTransaction.from,
        value: mainTransaction.value,
        data: mainTransaction.data,
        chainId: 100 // Gnosis Chain
      }
    };
  } catch (error) {
    console.error('Error generating transaction data:', error);
    return null;
  }
}

// Helper function to map user-friendly actions to function names
function mapActionToFunction(action: string, strategyType: string): string {
  switch (action.toLowerCase()) {
    case 'enter':
    case 'deposit':
      return strategyType === 'Lending' ? 'supply' : 'deposit';
    case 'exit':
    case 'withdraw':
      return strategyType === 'Lending' ? 'withdraw' : 'withdraw';
    case 'addliquidity':
      return 'addLiquidity';
    case 'removeliquidity':
      return 'removeLiquidity';
    case 'stake':
      return 'stake';
    case 'unstake':
      return 'unstake';
    default:
      return 'deposit'; // Default action
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract required parameters
    const strategyId = searchParams.get('strategyId');
    const action = searchParams.get('action');
    const amount = searchParams.get('amount');
    const userAddress = searchParams.get('userAddress');

    // Validate required parameters
    if (!strategyId || !action || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: strategyId, action, amount, and userAddress are required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['deposit', 'withdraw', 'addLiquidity', 'removeLiquidity', 'stake', 'unstake', 'enter', 'exit'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate transaction data
    const txResponse = await generateTransactionData(strategyId, action, amount, userAddress);

    if (!txResponse) {
      return NextResponse.json(
        { error: 'Failed to generate transaction data for the selected strategy' },
        { status: 500 }
      );
    }

    return NextResponse.json(txResponse);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}