// Protocol router addresses on Gnosis Chain
export const PROTOCOL_ROUTERS: Record<string, string> = {
  'agave': '0x5E15d5E33d318dCEd84Bfe3F4EACe07909bE6d99', // Agave LendingPool
  'aave': '0xb50201558B00496A145fE76f7424749556E326D8', // Aave v3 Pool
  'aave-v3': '0xb50201558B00496A145fE76f7424749556E326D8', // Aave v3 Pool
  'honeyswap': '0x1C232F01118CB8B424793ae03F870aa7D0ac7f77', // Honeyswap Router
  'sushiswap': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap Router
  'curve': '0x0C0BF2bD544566A11f59dC70a8F43659ac2FE7c2', // Curve Gnosis Pool
  'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // Balancer Vault
  'stakewise': '0xA4C637e0F704745D782e4C6e12c7dF7C7dcc8F5e', // StakeWise
  'hyperdrive': '0x25431341A5800759268a6aC1d3CD91C029D7d9f3',
  'sparklend': '0x2E7d06F1b3a80593f9ab038C94cC64ad175fa8dd',
  'aura': '0x6A9fF81bbFaD6f8f7654c4e51513e26507680640',
  'honeycomb': '0x77F99B212Ef4C78c64b7BAD038A7FE6882Bc9BF1',
};

// Balancer Vault address on Gnosis Chain
export const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

// For Aura/Balancer pool IDs on Gnosis Chain
export const POOL_IDS: Record<string, string> = {
  'SDAI-STATAGNOUSDCE': '0x00d7c137996aa7bf16d83ecbfd4d3d5cce77c0c8000200000000000000000a25',
  // Add other pool IDs as needed
};

// Native token representation addresses
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const WXDAI_ADDRESS = '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d';

// Max approval amount for ERC20 tokens
export const MAX_APPROVAL = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935"
);

// Map of supported staking providers on Gnosis Chain
export const STAKING_CONTRACTS: Record<string, string> = {
  'gno': '0xabc123...', // Replace with actual contract addresses
  'agave': '0xdef456...',
  'swapr': '0xghi789...'
};

// Map of token addresses for staking contracts
export const TOKEN_CONTRACTS: Record<string, string> = {
  'gno': '0x123abc...', // Replace with actual token addresses
  'agave': '0x456def...',
  'swapr': '0x789ghi...'
};

// Map of token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
  'gno': 18,
  'agave': 18,
  'swapr': 18
};