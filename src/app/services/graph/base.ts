// Graph configuration

  const BASE_URL = 'https://gateway.thegraph.com/api/subgraphs/id';


export const GRAPH_CONFIG = {
  getApiKey: () => process.env.GRAPH_API_KEY || '',
  ENDPOINTS: {
    symmetric: `${BASE_URL}/9kdgh1tW36E8MKthUmZ2FJbe2KCuvkibz984SxbQSdJw`,
    sushiswap: `${BASE_URL}/9LC6MvaFHXyY3dmxM7VCwGNA9dvM6g2AuZxEGCyfvck3`,
    balancer: `${BASE_URL}/yeZGqiwNf3Lqpeo8XNHih83bk5Tbu4KvFwWVy3Dbus6`,
    aave: `${BASE_URL}/GiNMLDxT1Bdn2dQZxjQLmW24uwpc3geKUBW8RP6oEdg`,
    rmm: `${BASE_URL}/2xrWGGZ5r8Z7wdNdHxhbRVKcAD2dDgv3F2NcjrZmxifJ`,
    curve: `${BASE_URL}/J8k2z8MhdhABfVZU5HtyRvzCT85bLLF886V4iDpt53Jr`,
    agave: `${BASE_URL}/Hn7FbfXZQ8qsNZvGogymrhdusrinifkH172bpPYNi5Kv`,
    honeyswap: `${BASE_URL}/HTxWvPGcZ5oqWLYEVtWnVJDfnai2Ud1WaABiAR72JaSJ`,
    swapr: `${BASE_URL}/EWoa3JwNntAWtaLsLixTU25smp4R5tzGvs9rFXx9NHKZ`
  }
};

// GraphQL error type
interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

/**
 * Generic function to fetch data from any subgraph
 */
export async function fetchGraph<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(GRAPH_CONFIG.getApiKey() ? { Authorization: `Bearer ${GRAPH_CONFIG.getApiKey()}` } : {})
      },
      body: JSON.stringify({
        query,
        variables: {
          ...variables,
          subgraphError: 'deny',
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    const { data, errors } = responseData;

    if (errors) {
      // Handle specific GraphQL errors
      const errorMessages = errors.map((error: GraphQLError) => {
        if (error.message.includes('rate limit')) {
          return 'Rate limit exceeded. Please try again later.';
        }
        if (error.message.includes('query complexity')) {
          return 'Query too complex. Please simplify your request.';
        }
        return error.message;
      });
      throw new Error(`GraphQL errors: ${errorMessages.join(', ')}`);
    }

    if (!data) {
      throw new Error('No data returned from GraphQL query');
    }

    return data;
  } catch (error) {
    console.error('Error in fetchGraph:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching from The Graph');
  }
}

// Common response types for strategies
export interface Strategy {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  type: string;
  description: string;
  apy: string;
  riskLevel: string;
  tvl: string;
  link: string;
  network: string;
  tags: string[];
  minInvestment: string;
  lastUpdated?: string;
  totalVolume24h?: string;
  feesEarned24h?: string;
  utilization?: string;
  reserves?: string[];
}