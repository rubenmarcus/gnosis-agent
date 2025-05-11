import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { stakingService } from '@/app/services/blockchain/transactions/staking';
import { STAKING_CONTRACTS, TOKEN_CONTRACTS, TOKEN_DECIMALS } from '@/app/config/contracts';

export async function POST(request: Request) {
  try {
    // Parse request body
    const { address, protocol, amount, privateKey } = await request.json();

    // Validate parameters
    if (!address || !protocol || !amount || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Normalize and validate address
    let userAddress;
    try {
      userAddress = getAddress(address);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Check if protocol is supported
    if (!STAKING_CONTRACTS[protocol]) {
      return NextResponse.json(
        { error: 'Unsupported staking protocol' },
        { status: 400 }
      );
    }

    // Get contract addresses
    const stakingContract = STAKING_CONTRACTS[protocol];
    const tokenContract = TOKEN_CONTRACTS[protocol];
    const decimals = TOKEN_DECIMALS[protocol];

    // Prepare transaction
    const txParams = await stakingService.stakeTokens(
      stakingContract,
      tokenContract,
      amount,
      decimals
    );

    // In a production app, you'd never accept private keys from the client
    // This is just for demonstration - in reality you'd use a secure wallet service
    // or have the user sign the transaction client-side
    const txHash = await stakingService.sendTransaction(txParams, privateKey);

    // Wait for transaction receipt
    const receipt = await stakingService.waitForTransaction(txHash);

    // Return transaction details
    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber,
      protocol,
      amount,
      status: receipt.status
    });
  } catch (error) {
    console.error('Error in stake endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process staking transaction' },
      { status: 500 }
    );
  }
}

// Helper endpoint to get staking info
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const protocol = searchParams.get('protocol');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Normalize and validate address
    let userAddress;
    try {
      userAddress = getAddress(address);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // If protocol is specified, get info for that protocol only
    if (protocol) {
      if (!STAKING_CONTRACTS[protocol]) {
        return NextResponse.json(
          { error: 'Unsupported staking protocol' },
          { status: 400 }
        );
      }

      const stakingInfo = await stakingService.getStakingInfo(
        STAKING_CONTRACTS[protocol],
        userAddress
      );

      return NextResponse.json({
        protocol,
        stakingInfo
      });
    }

    // Otherwise, get info for all supported protocols
    const stakingInfo = {};
    for (const [protocol, contractAddress] of Object.entries(STAKING_CONTRACTS)) {
      stakingInfo[protocol] = await stakingService.getStakingInfo(
        contractAddress,
        userAddress
      );
    }

    return NextResponse.json({
      protocols: stakingInfo
    });
  } catch (error) {
    console.error('Error getting staking info:', error);
    return NextResponse.json(
      { error: 'Failed to get staking information' },
      { status: 500 }
    );
  }
}