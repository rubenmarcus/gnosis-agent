import { createPublicClient, createWalletClient, http, type Hash, type Address, type PublicClient, type Transport, type Chain, type TransactionReceipt } from 'viem';
import { gnosis } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Types for transaction parameters
export interface TransactionParams {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

// Base transaction service
export class TransactionService {
  private publicClient: PublicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: gnosis,
      transport: http(process.env.RPC_URL || 'https://rpc.gnosischain.com')
    });
  }

  // Get gas estimate for a transaction
  async estimateGas(params: TransactionParams): Promise<bigint> {
    try {
      return await this.publicClient.estimateGas({
        account: params.to, // This should be the sender in real usage
        to: params.to,
        value: params.value || BigInt(0),
        data: params.data,
      });
    } catch (error) {
      console.error('Gas estimation error:', error);
      throw new Error('Failed to estimate gas for transaction');
    }
  }

  // Get current gas price
  async getGasPrice(): Promise<bigint> {
    try {
      return await this.publicClient.getGasPrice();
    } catch (error) {
      console.error('Gas price error:', error);
      throw new Error('Failed to get current gas price');
    }
  }

  // Build a transaction with proper gas settings
  async buildTransaction(params: TransactionParams): Promise<TransactionParams> {
    try {
      // Get gas price and estimate
      const [gasPrice, gasEstimate] = await Promise.all([
        this.getGasPrice(),
        this.estimateGas(params)
      ]);

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      return {
        ...params,
        gasLimit,
        maxFeePerGas: params.maxFeePerGas || gasPrice,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas || (gasPrice / BigInt(2))
      };
    } catch (error) {
      console.error('Error building transaction:', error);
      throw new Error('Failed to build transaction with gas settings');
    }
  }

  // Send a transaction using a private key (for backend use only)
  async sendTransaction(params: TransactionParams, privateKey: `0x${string}`): Promise<Hash> {
    try {
      // Create account from private key
      const account = privateKeyToAccount(privateKey);

      // Create wallet client
      const walletClient = createWalletClient({
        account,
        chain: gnosis,
        transport: http(process.env.RPC_URL || 'https://rpc.gnosischain.com')
      });

      // Build transaction with gas settings
      const txWithGas = await this.buildTransaction(params);

      // Send transaction
      return await walletClient.sendTransaction({
        to: txWithGas.to,
        value: txWithGas.value,
        data: txWithGas.data,
        gas: txWithGas.gasLimit,
        maxFeePerGas: txWithGas.maxFeePerGas,
        maxPriorityFeePerGas: txWithGas.maxPriorityFeePerGas
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw new Error('Failed to send transaction');
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash: Hash): Promise<TransactionReceipt> {
    try {
      return await this.publicClient.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      throw new Error('Failed to get transaction receipt');
    }
  }

  // Wait for transaction to be mined
  async waitForTransaction(txHash: Hash, confirmations = 1): Promise<TransactionReceipt> {
    try {
      return await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations
      });
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw new Error('Failed to wait for transaction confirmation');
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();