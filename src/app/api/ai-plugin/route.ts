import { ACCOUNT_ID, PLUGIN_URL } from '@/app/config';
import { NextResponse } from 'next/server';

export async function GET() {
  const pluginData = {
    openapi: '3.0.0',
    info: {
      title: 'Gnosis Pilot',
      description: 'API for the Gnosis Pilot DeFi optimization agent',
      version: '1.0.0',
    },
    servers: [
      {
        url: PLUGIN_URL,
      },
    ],
    'x-mb': {
      'account-id': ACCOUNT_ID,
      assistant: {
        name: 'Gnosis Pilot',
        description:
          "A DeFi assistant that helps optimize your yield strategy portfolio on Gnosis Chain based on risk preferences and current holdings.",
        instructions:
          "You're Gnosis Pilot, a specialized DeFi advisor focused on optimizing yields on Gnosis Chain. You help users discover and implement yield strategies based on their risk profile (low, medium, high) and current holdings. You can fetch user portfolios, suggest optimized strategy allocations, provide detailed information about different DeFi protocols, and help users execute transactions to enter or exit positions. For transactions, you must first generate a transaction payload using the appropriate endpoints (/api/pilot/create-transaction), then explicitly use the 'generate-evm-tx' tool to execute the transaction on the client side.",
        tools: [
          { type: 'generate-evm-tx' },
        ],
      },
    },
    paths: {
      '/api/pilot/get-strategies': {
        get: {
          summary: 'Get yield strategies on Gnosis Chain',
          description: 'Returns a list of available yield strategies on Gnosis Chain, filtered by various parameters',
          operationId: 'getGnosisStrategies',
          parameters: [
            {
              name: 'riskLevel',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'all'],
              },
              description: 'Filter strategies by risk level',
            },
            {
              name: 'minApy',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Minimum APY percentage (e.g., "5" for 5%)',
            },
            {
              name: 'maxApy',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Maximum APY percentage (e.g., "20" for 20%)',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      strategies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'Unique identifier for the strategy',
                            },
                            name: {
                              type: 'string',
                              description: 'Name of the strategy',
                            },
                            protocol: {
                              type: 'string',
                              description: 'DeFi protocol name',
                            },
                            asset: {
                              type: 'string',
                              description: 'Asset or token pair used in the strategy',
                            },
                            type: {
                              type: 'string',
                              description: 'Type of strategy (e.g., Lending, Liquidity Providing)',
                            },
                            description: {
                              type: 'string',
                              description: 'Description of the strategy',
                            },
                            apy: {
                              type: 'string',
                              description: 'Annual percentage yield',
                            },
                            riskLevel: {
                              type: 'string',
                              description: 'Risk level (low, medium, high)',
                            },
                            tvl: {
                              type: 'string',
                              description: 'Total value locked in the strategy',
                            },
                            network: {
                              type: 'string',
                              description: 'Blockchain network (gnosis)',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/pilot/optimize-portfolio': {
        get: {
          summary: 'Optimize DeFi portfolio on Gnosis Chain',
          description: 'Generates optimized allocation recommendations for DeFi strategies based on risk profile',
          operationId: 'optimizeGnosisPortfolio',
          parameters: [
            {
              name: 'address',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The EVM address to optimize portfolio for',
            },
            {
              name: 'riskProfile',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                default: 'medium',
              },
              description: 'Risk profile for portfolio optimization',
            },
            {
              name: 'investmentAmount',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Optional investment amount to optimize (if not provided, will use total portfolio value)',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      optimizedAllocation: {
                        type: 'object',
                        properties: {
                          riskProfile: {
                            type: 'string',
                            description: 'Risk profile used for optimization',
                          },
                          totalInvestment: {
                            type: 'string',
                            description: 'Total investment amount in USD',
                          },
                          expectedAnnualYield: {
                            type: 'string',
                            description: 'Expected annual yield percentage',
                          },
                          recommendations: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: {
                                  type: 'string',
                                  description: 'Strategy ID',
                                },
                                name: {
                                  type: 'string',
                                  description: 'Strategy name',
                                },
                                recommendedAllocation: {
                                  type: 'object',
                                  properties: {
                                    percent: {
                                      type: 'number',
                                      description: 'Allocation percentage',
                                    },
                                    amount: {
                                      type: 'string',
                                      description: 'Allocation amount in USD',
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      currentAllocation: {
                        type: 'object',
                        description: 'Current portfolio allocation',
                      },
                      recommendedStrategies: {
                        type: 'array',
                        description: 'Top recommended strategies',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/pilot/strategy-details': {
        get: {
          summary: 'Get detailed information about a specific strategy',
          description: 'Returns comprehensive details about a specific DeFi strategy on Gnosis Chain',
          operationId: 'getStrategyDetails',
          parameters: [
            {
              name: 'id',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'Strategy ID to get details for',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      strategy: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            description: 'Strategy ID',
                          },
                          name: {
                            type: 'string',
                            description: 'Strategy name',
                          },
                          protocol: {
                            type: 'string',
                            description: 'Protocol name',
                          },
                          asset: {
                            type: 'string',
                            description: 'Asset or token pair',
                          },
                          description: {
                            type: 'string',
                            description: 'Detailed description',
                          },
                          apy: {
                            type: 'string',
                            description: 'Current APY',
                          },
                          riskLevel: {
                            type: 'string',
                            description: 'Risk level (low, medium, high)',
                          },
                          details: {
                            type: 'object',
                            description: 'Detailed information about the strategy',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Strategy not found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/pilot/create-transaction': {
        get: {
          summary: 'Create a transaction payload for a DeFi strategy',
          description: 'Generates an EVM transaction payload for entering or exiting a DeFi strategy on Gnosis Chain',
          operationId: 'createGnosisTransaction',
          parameters: [
            {
              name: 'strategyId',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The ID of the strategy to create a transaction for',
            },
            {
              name: 'action',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                enum: ['deposit', 'withdraw', 'addLiquidity', 'removeLiquidity', 'stake', 'unstake'],
              },
              description: 'The action to perform with the strategy',
            },
            {
              name: 'amount',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The amount to use in the transaction',
            },
            {
              name: 'userAddress',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The user\'s EVM address',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      transactionPayload: {
                        type: 'object',
                        properties: {
                          to: {
                            type: 'string',
                            description: 'Target contract address',
                          },
                          from: {
                            type: 'string',
                            description: 'User address',
                          },
                          value: {
                            type: 'string',
                            description: 'Transaction value in wei',
                          },
                          data: {
                            type: 'string',
                            description: 'Transaction data',
                          },
                          chainId: {
                            type: 'number',
                            description: 'Chain ID (100 for Gnosis)',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Strategy not found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/pilot/suggest-strategies-from-pools': {
        get: {
          summary: 'Suggest strategies from available liquidity pools',
          description: 'Recommends optimized yield strategies based on specific liquidity pools that match user preferences',
          operationId: 'suggestStrategiesFromPools',
          parameters: [
            {
              name: 'address',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The user\'s EVM address',
            },
            {
              name: 'riskLevel',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'all'],
                default: 'all',
              },
              description: 'Filter pool strategies by risk level',
            },
            {
              name: 'assetType',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['stablecoin', 'eth', 'altcoin', 'all'],
                default: 'all',
              },
              description: 'Filter by asset type in the liquidity pools',
            },
            {
              name: 'maxPoolCount',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                default: 5,
              },
              description: 'Maximum number of pool strategies to return',
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      poolStrategies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'Unique identifier for the pool strategy',
                            },
                            name: {
                              type: 'string',
                              description: 'Name of the pool strategy',
                            },
                            protocol: {
                              type: 'string',
                              description: 'DeFi protocol name',
                            },
                            poolTokens: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Tokens in the liquidity pool',
                            },
                            relevance: {
                              type: 'string',
                              description: 'Relevance score for this user (higher is better)',
                            },
                            apy: {
                              type: 'string',
                              description: 'Annual percentage yield',
                            },
                            fees: {
                              type: 'string',
                              description: 'Fee structure for the pool',
                            },
                            riskLevel: {
                              type: 'string',
                              description: 'Risk level (low, medium, high)',
                            },
                            tvl: {
                              type: 'string',
                              description: 'Total value locked in the pool',
                            },
                            recommendedAllocation: {
                              type: 'string',
                              description: 'Recommended allocation amount based on user portfolio',
                            },
                            userHoldsAssets: {
                              type: 'boolean',
                              description: 'Whether user already holds the required assets',
                            }
                          },
                        },
                      },
                      userPortfolioSummary: {
                        type: 'object',
                        properties: {
                          assets: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                symbol: {
                                  type: 'string',
                                  description: 'Asset symbol',
                                },
                                balance: {
                                  type: 'string',
                                  description: 'User balance of this asset',
                                },
                                usdValue: {
                                  type: 'string',
                                  description: 'USD value of the asset balance',
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/pilot/get-portfolio': {
        get: {
          summary: 'Get user portfolio on Gnosis Chain',
          description: 'Returns the current portfolio holdings and positions for a specified Ethereum address on Gnosis Chain',
          operationId: 'getGnosisPortfolio',
          parameters: [
            {
              name: 'address',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The EVM address to get portfolio for',
            },
            {
              name: 'includeTokens',
              in: 'query',
              required: false,
              schema: {
                type: 'boolean',
                default: true,
              },
              description: 'Whether to include token balances in the response',
            },
            {
              name: 'includePositions',
              in: 'query',
              required: false,
              schema: {
                type: 'boolean',
                default: true,
              },
              description: 'Whether to include active DeFi positions in the response',
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      address: {
                        type: 'string',
                        description: 'The queried EVM address',
                      },
                      totalValueUSD: {
                        type: 'string',
                        description: 'Total portfolio value in USD',
                      },
                      tokens: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            symbol: {
                              type: 'string',
                              description: 'Token symbol',
                            },
                            name: {
                              type: 'string',
                              description: 'Token name',
                            },
                            address: {
                              type: 'string',
                              description: 'Token contract address',
                            },
                            balance: {
                              type: 'string',
                              description: 'Token balance',
                            },
                            decimals: {
                              type: 'integer',
                              description: 'Token decimals',
                            },
                            price: {
                              type: 'string',
                              description: 'Current token price in USD',
                            },
                            valueUSD: {
                              type: 'string',
                              description: 'USD value of the token balance',
                            }
                          }
                        }
                      },
                      positions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            protocol: {
                              type: 'string',
                              description: 'Protocol name',
                            },
                            type: {
                              type: 'string',
                              description: 'Type of position (e.g., Lending, LP, Staking)',
                            },
                            assets: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Assets involved in the position',
                            },
                            value: {
                              type: 'string',
                              description: 'Value of the position in USD',
                            },
                            apy: {
                              type: 'string',
                              description: 'Current APY for the position',
                            },
                            strategyId: {
                              type: 'string',
                              description: 'Associated strategy ID if applicable',
                            }
                          }
                        }
                      }
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        description: 'Error message',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(pluginData);
}
