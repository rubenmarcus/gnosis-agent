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
          "A DeFi assistant that helps optimize your yield strategy portfolio on Gnosis Chain based on risk preferences and current holdings. ",
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
            {
              name: 'source',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['all', 'defillama', 'subgraph'],
                default: 'all',
              },
              description: 'Data source for strategies',
            },
            {
              name: 'protocol',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter by specific protocol name',
            },
            {
              name: 'skipCache',
              in: 'query',
              required: false,
              schema: {
                type: 'boolean',
                default: false,
              },
              description: 'Whether to skip cached results and fetch fresh data',
            },
            {
              name: 'address',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Wallet address for portfolio analysis and personalized recommendations',
            },
            {
              name: 'minApyMean30d',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Minimum 30-day mean APY percentage',
            },
            {
              name: 'maxApyMean30d',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Maximum 30-day mean APY percentage',
            },
            {
              name: 'asset',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter by asset or token name',
            },
            {
              name: 'exposure',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter by exposure type',
            },
            {
              name: 'predictedClass',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter by predicted yield class',
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                default: 50,
              },
              description: 'Number of results to return per page',
            },
            {
              name: 'offset',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                default: 0,
              },
              description: 'Offset for pagination',
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
                            apyBase: {
                              type: 'number',
                              description: 'Base APY without rewards',
                              nullable: true
                            },
                            apyReward: {
                              type: 'number',
                              description: 'APY from rewards only',
                              nullable: true
                            },
                            apyPct1D: {
                              type: 'number',
                              description: '1-day APY percentage change',
                              nullable: true
                            },
                            apyPct7D: {
                              type: 'number',
                              description: '7-day APY percentage change',
                              nullable: true
                            },
                            apyPct30D: {
                              type: 'number',
                              description: '30-day APY percentage change',
                              nullable: true
                            },
                            apyMean30d: {
                              type: 'number',
                              description: '30-day mean APY',
                              nullable: true
                            },
                            exposure: {
                              type: 'string',
                              description: 'Market exposure category',
                              nullable: true
                            },
                            underlyingTokens: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Underlying tokens in the strategy',
                              nullable: true
                            },
                            rewardTokens: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Reward tokens provided by the strategy',
                              nullable: true
                            },
                            pool: {
                              type: 'string',
                              description: 'Pool identifier',
                              nullable: true
                            },
                            predictions: {
                              type: 'object',
                              properties: {
                                predictedClass: {
                                  type: 'string',
                                  description: 'Predicted yield class'
                                },
                                predictedProbability: {
                                  type: 'number',
                                  description: 'Probability of the prediction'
                                },
                                binnedConfidence: {
                                  type: 'number',
                                  description: 'Binned confidence level'
                                }
                              },
                              description: 'Yield prediction data',
                              nullable: true
                            },
                            portfolioMatch: {
                              type: 'object',
                              properties: {
                                matchingTokens: {
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  },
                                  description: 'Tokens matching user portfolio'
                                },
                                matchScore: {
                                  type: 'number',
                                  description: 'Portfolio match score'
                                },
                                recommendationReason: {
                                  type: 'string',
                                  description: 'Reason for recommendation'
                                }
                              },
                              description: 'Portfolio match information when address is provided',
                              nullable: true
                            }
                          },
                        },
                      },
                      total: {
                        type: 'number',
                        description: 'Total number of strategies matching the criteria'
                      }
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
      '/api/pilot/execute-strategy': {
        post: {
          summary: 'Execute a DeFi strategy on Gnosis Chain',
          description: 'Executes a selected yield strategy on Gnosis Chain through a transaction',
          operationId: 'executeGnosisStrategy',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['strategyId', 'userAddress', 'action', 'amount'],
                  properties: {
                    strategyId: {
                      type: 'string',
                      description: 'ID of the strategy to execute',
                    },
                    userAddress: {
                      type: 'string',
                      description: 'User\'s EVM wallet address',
                    },
                    action: {
                      type: 'string',
                      enum: ['deposit', 'withdraw', 'addLiquidity', 'removeLiquidity', 'stake', 'unstake', 'enter', 'exit'],
                      description: 'Action to perform with the strategy. Use "enter" for adding liquidity to pools.',
                      default: 'enter'
                    },
                    amount: {
                      type: 'string',
                      description: 'Amount to use in the transaction',
                    },
                    slippageTolerance: {
                      type: 'string',
                      description: 'Optional slippage tolerance in percentage (e.g., "0.5" for 0.5%)',
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Strategy execution initiated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        description: 'Whether the transaction was successfully submitted',
                      },
                      transactionHash: {
                        type: 'string',
                        description: 'The transaction hash if successful',
                      },
                      message: {
                        type: 'string',
                        description: 'Success message with details',
                      },
                      strategyDetails: {
                        type: 'object',
                        description: 'Details about the executed strategy',
                      }
                    }
                  }
                }
              }
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
                enum: ['deposit', 'withdraw', 'addLiquidity', 'removeLiquidity', 'stake', 'unstake', 'enter', 'exit'],
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
            {
              name: 'promptExecution',
              in: 'query',
              required: false,
              schema: {
                type: 'boolean',
                default: false
              },
              description: 'Whether to prompt the user to execute the transaction immediately after generating the payload',
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
      '/api/pilot/get-pools': {
        get: {
          summary: 'Get available liquidity pools on Gnosis Chain',
          description: 'Returns a list of available liquidity pools on Gnosis Chain with details about APY, TVL, and tokens from DeFi Llama',
          operationId: 'getGnosisPools',
          parameters: [
            {
              name: 'project',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                description: 'Filter pools by protocol name (e.g., balancer-v2, sdai, aura)',
              },
              description: 'Filter pools by protocol/project',
            },
            {
              name: 'symbol',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter pools by symbol/token pair (e.g., WETH-WSTETH)',
            },
            {
              name: 'minTvl',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Minimum TVL in USD (e.g., "10000" for $10,000)',
            },
            {
              name: 'maxTvl',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Maximum TVL in USD',
            },
            {
              name: 'minApy',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Minimum APY percentage',
            },
            {
              name: 'maxApy',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Maximum APY percentage',
            },
            {
              name: 'minApyMean30d',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Minimum 30-day mean APY',
            },
            {
              name: 'maxApyMean30d',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Maximum 30-day mean APY',
            },
            {
              name: 'asset',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter pools containing specific token (symbol)',
            },
            {
              name: 'stablecoin',
              in: 'query',
              required: false,
              schema: {
                type: 'boolean',
              },
              description: 'Filter by stablecoin pools only',
            },
            {
              name: 'ilRisk',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['yes', 'no'],
              },
              description: 'Filter by impermanent loss risk',
            },
            {
              name: 'exposure',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['single', 'multi'],
              },
              description: 'Filter by asset exposure type',
            },
            {
              name: 'predictedClass',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Filter by predicted APY direction (e.g., "Stable/Up")',
            },
            {
              name: 'minConfidence',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Minimum prediction confidence level',
            },
            {
              name: 'risk',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'all'],
                default: 'all',
              },
              description: 'Filter pools by risk level',
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                default: 50,
              },
              description: 'Maximum number of pools to return',
            },
            {
              name: 'offset',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                default: 0,
              },
              description: 'Number of pools to skip for pagination',
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
                      pools: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'Unique identifier for the pool',
                            },
                            name: {
                              type: 'string',
                              description: 'Pool name (project + symbol)',
                            },
                            chain: {
                              type: 'string',
                              description: 'Blockchain name (Gnosis)',
                            },
                            project: {
                              type: 'string',
                              description: 'Protocol name (e.g., balancer-v2, sdai)',
                            },
                            symbol: {
                              type: 'string',
                              description: 'Pool symbol/token pair',
                            },
                            tvlUsd: {
                              type: 'number',
                              description: 'Total value locked in USD',
                            },
                            apyBase: {
                              type: 'number',
                              nullable: true,
                              description: 'Base APY without rewards',
                            },
                            apyReward: {
                              type: 'number',
                              nullable: true,
                              description: 'Reward APY',
                            },
                            apy: {
                              type: 'number',
                              description: 'Total APY (base + reward)',
                            },
                            rewardTokens: {
                              type: 'array',
                              nullable: true,
                              items: {
                                type: 'string'
                              },
                              description: 'Reward token addresses',
                            },
                            pool: {
                              type: 'string',
                              description: 'Pool ID',
                            },
                            apyPct1D: {
                              type: 'number',
                              nullable: true,
                              description: '1-day APY percentage change',
                            },
                            apyPct7D: {
                              type: 'number',
                              nullable: true,
                              description: '7-day APY percentage change',
                            },
                            apyPct30D: {
                              type: 'number',
                              nullable: true,
                              description: '30-day APY percentage change',
                            },
                            stablecoin: {
                              type: 'boolean',
                              description: 'Whether the pool is for stablecoins',
                            },
                            ilRisk: {
                              type: 'string',
                              description: 'Impermanent loss risk (yes/no)',
                            },
                            exposure: {
                              type: 'string',
                              description: 'Asset exposure type (single/multi)',
                            },
                            predictions: {
                              type: 'object',
                              properties: {
                                predictedClass: {
                                  type: 'string',
                                  description: 'Predicted APY direction',
                                },
                                predictedProbability: {
                                  type: 'number',
                                  description: 'Probability of prediction',
                                },
                                binnedConfidence: {
                                  type: 'number',
                                  description: 'Confidence level',
                                }
                              },
                              description: 'APY prediction data',
                            },
                            underlyingTokens: {
                              type: 'array',
                              nullable: true,
                              items: {
                                type: 'string'
                              },
                              description: 'Addresses of underlying tokens',
                            },
                            assets: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Asset symbols in the pool',
                            },
                            risk: {
                              type: 'string',
                              description: 'Risk level (low, medium, high)',
                            },
                            apyMean30d: {
                              type: 'number',
                              nullable: true,
                              description: '30-day mean APY',
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
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
