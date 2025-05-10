import { type WalletBalance, fetchEvmBalances } from '@/app/data/getUserBalance';
import { type NextRequest, NextResponse } from 'next/server';

// In-memory cache for balance data with 60-second TTL
interface CacheEntry {
  data: WalletBalance[];
  totals: {
    usdValue: number;
    tokenCount: number;
  };
  timestamp: number;
}

const balanceCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 seconds in milliseconds


// Handler for the GET request
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const chain = searchParams.get('chain') || 'eth';

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }





  try {
    // Create a cache key from address and chain
    const cacheKey = `${address.toLowerCase()}:${chain.toLowerCase()}`;

    // Check if we have a valid cache entry
    const cachedEntry = balanceCache.get(cacheKey);
    const currentTime = Date.now();

    if (cachedEntry && currentTime - cachedEntry.timestamp < CACHE_TTL) {
      console.log(`Cache hit for ${cacheKey}, returning cached data`);
      // Return cached data if it's less than 60 seconds old
      return NextResponse.json({
        data: cachedEntry.data,
        totals: cachedEntry.totals,
        cached: true,
      });
    }

    // Cache miss or expired, fetch fresh data
    console.log(`Cache miss for ${cacheKey}, fetching fresh data`);

    // Convert chain slug to chain ID
    const balances = await fetchEvmBalances(address);

    console.log(balances, 'balances');

    // Filter balances to only include gnosis chain
    const filteredBalances = balances.filter(
      (token) => token.token.chainId === 100
    );

    // Calculate total USD value across all tokens
    const totalUsdValue = filteredBalances.reduce(
      (sum, token) => sum + (token.usdValue || 0),
      0
    );

    // Create totals object
    const totals = {
      usdValue: totalUsdValue,
      tokenCount: filteredBalances.length,
    };

    // Store in cache
    balanceCache.set(cacheKey, {
      data: filteredBalances,
      totals,
      timestamp: currentTime,
    });

    // Return filtered balances
    return NextResponse.json({
      data: filteredBalances,
      totals,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
