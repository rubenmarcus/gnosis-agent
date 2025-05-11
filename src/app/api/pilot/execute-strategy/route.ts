import { NextResponse } from 'next/server';
import { getDefiLlamaStrategies } from '../get-strategies/route';
import { parseEther, encodeFunctionData, toHex, getAddress, Address } from 'viem';

// Protocol router addresses on Gnosis Chain
const PROTOCOL_ROUTERS: Record<string, string> = {
  'agave': '0x5E15d5E33d318dCEd84Bfe3F4EACe07909bE6d99', // Agave LendingPool
  'aave': '0xb50201558B00496A145fE76f7424749556E326D8', // Aave v3 Pool
  'honeyswap': '0x1C232F01118CB8B424793ae03F870aa7D0ac7f77', // Honeyswap Router
  'sushiswap': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap Router
  'curve': '0x0C0BF2bD544566A11f59dC70a8F43659ac2FE7c2', // Curve Gnosis Pool
  'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // Balancer Vault
  'stakewise': '0xA4C637e0F704745D782e4C6e12c7dF7C7dCC8F5e', // StakeWise
  'hyperdrive': '0x25431341A5800759268a6aC1d3CD91C029D7d9f3',
  'sparklend': '0x2E7d06F1b3a80593f9ab038C94cC64ad175fa8dd',
  'aura': '0x6A9fF81bbFaD6f8f7654c4e51513e26507680640',
  'honeycomb': '0x77F99B212Ef4C78c64b7BAD038A7FE6882Bc9BF1',
};

// Balancer Vault address on Gnosis Chain
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

// For Aura/Balancer pool IDs on Gnosis Chain
const POOL_IDS: Record<string, string> = {
  'SDAI-STATAGNOUSDCE': '0x00d7c137996aa7bf16d83ecbfd4d3d5cce77c0c8000200000000000000000a25',
  // Add other pool IDs as needed
};

// Native token representation addresses
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WXDAI_ADDRESS = '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d';

// Max approval amount for ERC20 tokens
const MAX_APPROVAL = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935",
);

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

// Interface for EVM Transaction Parameters
interface MetaTransaction {
  to: string;
  data: string;
  value: string;
  from: string;
}

// Interface for SignRequestData
interface SignRequestData {
  method: 'eth_sendTransaction';
  chainId: number;
  params: MetaTransaction[];
}

// Interface for our response
interface ExecuteStrategyResponse {
  signRequest: SignRequestData;
  message: string;
  meta?: {
    strategyId: string;
    protocol: string;
    type: string;
  };
}

// Helper to create approval transaction
function createApprovalTransaction(
  tokenAddress: string,
  spenderAddress: string,
  userAddress: string
): MetaTransaction {
  const txData = encodeFunctionData({
    abi: [FUNCTION_ABIS.approve],
    functionName: 'approve',
    args: [spenderAddress as `0x${string}`, MAX_APPROVAL]
  });

  return {
    to: tokenAddress,
    data: txData,
    value: '0x0',
    from: userAddress,
  };
}

// Helper to encode Balancer joinPool userData
function encodeBalancerJoinPoolData(amountIn: bigint): string {
  // Encode userData for exact tokens in with minimum BPT out
  // Format: (1, [amountsIn], minBPT)
  return encodeFunctionData({
    abi: [{
      name: 'joinExactTokensInForBPTOut',
      type: 'function',
      inputs: [
        { name: 'amountsIn', type: 'uint256[]' },
        { name: 'minimumBPT', type: 'uint256' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    }],
    functionName: 'joinExactTokensInForBPTOut',
    args: [
      [amountIn, BigInt(0)], // Only provide the first token
      BigInt(0) // Minimum BPT out (0 for now, can be adjusted for slippage protection)
    ]
  });
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
    let targetAddress = routerAddress;

    // Convert amount to wei format (hex string)
    const amountInWei = toHex(parseEther(amount));

    // Array to hold all transactions (approvals + main transaction)
    const metaTransactions: MetaTransaction[] = [];

    // Main transaction data
    let txData: string;
    let requiresApproval = false;

    // Check if the strategy involves native token (xDAI)
    const isNativeToken = isNativeTokenAddress(tokenAddress);

    // Determine if we need approval and set the token address based on strategy type
    if (strategy.type === 'Lending') {
      // Generate lending transaction data
      requiresApproval = !isNativeToken; // Only require approval for non-native tokens

      if (protocolKey === 'agave') {
        // Use specific Agave deposit function with correct ABI
        txData = encodeFunctionData({
          abi: [FUNCTION_ABIS.agaveDeposit],
          functionName: 'deposit',
          args: [
            isNativeToken ? WXDAI_ADDRESS as `0x${string}` : tokenAddress as `0x${string}`,
            parseEther(amount),
            userAddress as `0x${string}`,
            0 // referral code
          ]
        });
      } else {
        // Use generic lending function
        txData = encodeFunctionData({
          abi: [FUNCTION_ABIS.lend],
          functionName: 'supply',
          args: [
            isNativeToken ? WXDAI_ADDRESS as `0x${string}` : tokenAddress as `0x${string}`,
            parseEther(amount),
            userAddress as `0x${string}`,
            0 // referral code
          ]
        });
      }
    } else if (strategy.type === 'Liquidity Providing') {
      // Most LP actions require token approval
      requiresApproval = !isNativeToken;

      if (protocolKey === 'aura' || protocolKey === 'balancer') {
        // Extract pool name from strategy name
        // Strategy names can be formatted like "Aura SDAI-STATAGNOUSDCE" or similar
        let poolName = '';

        // Try to extract the pool name from the strategy name or description
        if (strategy.name.includes('SDAI-STATAGNOUSDCE')) {
          poolName = 'SDAI-STATAGNOUSDCE';
        } else {
          // Generic fallback extraction (improve this as needed)
          const poolNameMatch = strategy.name.match(/AURA.+?(\S+-\S+)/i) ||
                               strategy.name.match(/(\S+-\S+)/);
          poolName = poolNameMatch ? poolNameMatch[1] : '';
        }

        console.log(`Extracted pool name: ${poolName}`);

        const poolId = POOL_IDS[poolName];

        if (!poolId) {
          throw new Error(`Pool ID not found for ${poolName} in Aura/Balancer strategy ${strategy.name}`);
        }

        // For Aura/Balancer, use the Balancer Vault as spender for approvals
        if (requiresApproval) {
          metaTransactions.push(createApprovalTransaction(
            tokenAddress,
            BALANCER_VAULT,
            userAddress
          ));
        }

        // Get the tokens array from the strategy
        const tokensArray = strategy.underlyingTokens.map(token => token as `0x${string}`);

        // Check if the first token is xDAI (native token)
        if (isNativeToken) {
          // Replace the xDAI placeholder with WETH address since Balancer uses WETH for native token
          // On Gnosis Chain, WXDAI is used
          tokensArray[0] = WXDAI_ADDRESS as `0x${string}`;

          // Create an array of maxAmountsIn (only first token has amount)
          const maxAmountsIn = tokensArray.map((_, index) =>
            index === 0 ? parseEther(amount) : BigInt(0)
          );

          // Create Balancer joinPoolETH function call for native token
          txData = encodeFunctionData({
            abi: [FUNCTION_ABIS.balancerJoinETH],
            functionName: 'joinPoolETH',
            args: [
              poolId as `0x${string}`,
              userAddress as `0x${string}`,
              [
                tokensArray,
                maxAmountsIn,
                encodeBalancerJoinPoolData(parseEther(amount)),
                false // fromInternalBalance
              ]
            ]
          });
        } else {
          // Create an array of maxAmountsIn (only first token has amount)
          const maxAmountsIn = tokensArray.map((_, index) =>
            index === 0 ? parseEther(amount) : BigInt(0)
          );

          // Create Balancer joinPool function call for ERC20 tokens
          txData = encodeFunctionData({
            abi: [FUNCTION_ABIS.balancerJoin],
            functionName: 'joinPool',
            args: [
              poolId as `0x${string}`,
              userAddress as `0x${string}`,
              userAddress as `0x${string}`,
              [
                tokensArray,
                maxAmountsIn,
                encodeBalancerJoinPoolData(parseEther(amount)),
                false // fromInternalBalance
              ]
            ]
          });
        }

        // Balancer Vault is the target for the transaction, not the Aura router
        targetAddress = BALANCER_VAULT;
      } else if (protocolKey === 'curve') {
        // For Curve-style pools
        // Require approval for the curve router
        if (!isNativeToken) {
          metaTransactions.push(createApprovalTransaction(
            tokenAddress,
            routerAddress,
            userAddress
          ));
        }

        txData = encodeFunctionData({
          abi: [FUNCTION_ABIS.curveDeposit],
          functionName: 'add_liquidity',
          args: [
            [parseEther(amount), BigInt(0), BigInt(0), BigInt(0)], // amounts array (first token only)
            BigInt(0) // min_mint_amount
          ]
        });
      } else {
        // For Uniswap/Sushiswap/Honeyswap style pools
        // Get the second token for the pair
        if (strategy.underlyingTokens.length < 2) {
          throw new Error(`Liquidity providing strategy ${strategyId} requires at least 2 tokens`);
        }

        const tokenB = strategy.underlyingTokens[1];

        // Validate the second token address
        if (!tokenB) {
          throw new Error(`Invalid second token address for strategy ${strategyId}`);
        }

        // Check if one of the tokens is the native token
        const tokenBIsNative = isNativeTokenAddress(tokenB);

        // Require approval for the token (if it's not the native token)
        if (!isNativeToken) {
          metaTransactions.push(createApprovalTransaction(
            tokenAddress,
            routerAddress,
            userAddress
          ));
        }

        if (!tokenBIsNative && !isNativeToken) {
          // Also need approval for tokenB
          metaTransactions.push(createApprovalTransaction(
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
              parseEther(amount),                           // amountToken
              BigInt(0),                                    // amountTokenMin
              BigInt(0),                                    // amountETHMin
              userAddress as `0x${string}`,                 // to
              BigInt(Math.floor(Date.now() / 1000) + 3600)  // deadline (1 hour)
            ]
          });
        } else {
          // Use standard addLiquidity for token pairs
          txData = encodeFunctionData({
            abi: [FUNCTION_ABIS.addLiquidity],
            functionName: 'addLiquidity',
            args: [
              tokenAddress as `0x${string}`,
              tokenB as `0x${string}`,
              parseEther(amount),                           // amountA
              parseEther(amount),                           // amountB
              BigInt(0),                                    // minAmountA
              BigInt(0),                                    // minAmountB
              userAddress as `0x${string}`,                 // to
              BigInt(Math.floor(Date.now() / 1000) + 3600)  // deadline (1 hour)
            ]
          });
        }
      }
    } else if (strategy.type === 'Staking') {
      // Some staking requires approval
      requiresApproval = !isNativeToken;

      if (requiresApproval) {
        metaTransactions.push(createApprovalTransaction(
          tokenAddress,
          targetAddress,
          userAddress
        ));
      }

      txData = encodeFunctionData({
        abi: [FUNCTION_ABIS.stake],
        functionName: 'stake',
        args: [parseEther(amount)]
      });
    } else {
      // Default deposit function for other types
      requiresApproval = !isNativeToken;

      if (requiresApproval) {
        metaTransactions.push(createApprovalTransaction(
          tokenAddress,
          targetAddress,
          userAddress
        ));
      }

      txData = encodeFunctionData({
        abi: [FUNCTION_ABIS.deposit],
        functionName: 'deposit',
        args: [parseEther(amount)]
      });
    }

    // Add the main transaction
    const mainTx: MetaTransaction = {
      to: targetAddress,
      data: txData,
      value: isNativeToken ? amountInWei : '0x0', // Only send value if it's a native token operation
      from: userAddress,
    };

    metaTransactions.push(mainTx);

    // Log the transaction for debugging
    console.log("Generated Tx:", {
      to: targetAddress,
      data: txData,
      value: isNativeToken ? amountInWei : '0x0',
      chainId: 100
    });

    // Format as SignRequestData for generate-evm-tx compatibility
    return {
      signRequest: {
        method: 'eth_sendTransaction',
        chainId: 100, // Gnosis Chain
        params: metaTransactions,
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

    // Log the action for debugging (will not affect execution since action isn't used in generateTransactionData)
    console.log(`Executing strategy with action: ${action || 'default'}`);

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