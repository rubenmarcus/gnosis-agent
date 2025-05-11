import type { Strategy } from './base';
import { getHoneyswapStrategies } from './protocols/honeyswap';
import { getAgaveStrategies } from './protocols/agave';
import { getSymmetricStrategies } from './protocols/symmetric';
// Import additional protocol strategies as you implement them
// import { getSushiswapStrategies } from './protocols/sushiswap';
// ...etc

/**
 * Fetches strategies from all configured DeFi protocols on Gnosis Chain
 * @param protocols Optional array of protocol names to filter by
 */
export async function getAllStrategies(protocols?: string[]): Promise<Strategy[]> {
  try {
    // Map of protocol name to fetch function
    const protocolFetchers: Record<string, () => Promise<Strategy[]>> = {
      'honeyswap': getHoneyswapStrategies,
      'agave': getAgaveStrategies,
      'symmetric': getSymmetricStrategies,
      // Add other protocols as they're implemented
      // 'sushiswap': getSushiswapStrategies,
      // ...etc
    };

    // If protocols are specified, only fetch those
    const fetchersToUse = protocols
      ? Object.entries(protocolFetchers)
          .filter(([key]) => protocols.includes(key.toLowerCase()))
          .map(([_, fetcher]) => fetcher)
      : Object.values(protocolFetchers);

    // Fetch all strategies in parallel
    const strategiesArrays = await Promise.all(
      fetchersToUse.map(fetcher =>
        fetcher().catch(error => {
          console.error('Error fetching from protocol:', error);
          return [];
        })
      )
    );

    // Flatten the array of arrays
    return strategiesArrays.flat();
  } catch (error) {
    console.error('Error fetching all strategies:', error);
    return [];
  }
}

// Re-export the Strategy type
export type { Strategy } from './base';