import { useChainId } from "wagmi";
import { arcTestnet } from "./chain";

export type TokenInfo = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  isNative?: boolean;
};

export type ChainContracts = {
  factory: `0x${string}`;
  weth: `0x${string}`;
  router: `0x${string}`;
  multicall: `0x${string}`;
};

const cmc = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;

// IOPN doesn't have a CMC listing — use a gradient mark.
const IOPN_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%234f46e5'/><stop offset='1' stop-color='%2306b6d4'/></linearGradient></defs><circle cx='32' cy='32' r='30' fill='url(%23g)'/><text x='50%25' y='56%25' text-anchor='middle' font-family='Inter,system-ui' font-size='20' font-weight='800' fill='white'>OPN</text></svg>`,
  );

// ---------- Arc Testnet ----------
const ARC_CONTRACTS: ChainContracts = {
  factory: "0x903211E8207A66b0e850CB08322198FF4b972BdF",
  weth: "0xAad965DAD0eF78198426abD83339E61713188496",
  router: "0x6A0257A3A9DD69f5eC8BB0a5c469CE17b003B643",
  multicall: "0x18efD372cab9d9ff31089b8f28E967Ce87Dd6B65",
};

const ARC_NATIVE: TokenInfo = {
  address: "0x0000000000000000000000000000000000000000",
  symbol: "USDC",
  name: "USDC (Native)",
  decimals: 18,
  logo: cmc(3408),
  isNative: true,
};

const ARC_TOKENS: TokenInfo[] = [
  ARC_NATIVE,
  { address: ARC_CONTRACTS.weth, symbol: "WUSDC", name: "Wrapped USDC", decimals: 18, logo: cmc(3408) },
  { address: "0xA95648526E7Bac1Bf6FDf70e84A59EA180D913d8", symbol: "BERA", name: "Berachain", decimals: 18, logo: cmc(24647) },
  { address: "0x6914F7ffAb2008863ce5a96291Ef5fAE1253B6a3", symbol: "TON", name: "Toncoin", decimals: 18, logo: cmc(11419) },
  { address: "0xDF1e9F36BbB046EfCfa9097127d4a47309aDDc2d", symbol: "HYPE", name: "Hyperliquid", decimals: 18, logo: cmc(32196) },
  { address: "0x4dc1c2525c79B9Ee3c8491ec6ac336BbED7aC3dF", symbol: "BNB", name: "BNB", decimals: 18, logo: cmc(1839) },
  { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", symbol: "EURC", name: "EURC", decimals: 6, logo: cmc(20641) },
];

// ---------- Per-chain registry ----------
export type ChainConfig = {
  chainId: number;
  name: string;
  shortName: string;
  logo: string;
  explorer: string;
  contracts: ChainContracts;
  nativeToken: TokenInfo;
  tokens: TokenInfo[];
};

export const CHAIN_CONFIG: Record<number, ChainConfig> = {
  [arcTestnet.id]: {
    chainId: arcTestnet.id,
    name: "Arc Testnet",
    shortName: "Arc",
    logo: cmc(3408),
    explorer: "https://testnet.arcscan.app",
    contracts: ARC_CONTRACTS,
    nativeToken: ARC_NATIVE,
    tokens: ARC_TOKENS,
  },
  [iopnTestnet.id]: {
    chainId: iopnTestnet.id,
    name: "IOPN Testnet",
    shortName: "IOPN",
    logo: IOPN_LOGO,
    explorer: "https://testnet.iopn.tech",
    contracts: IOPN_CONTRACTS,
    nativeToken: IOPN_NATIVE,
    tokens: IOPN_TOKENS,
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAIN_CONFIG).map(Number);

export function getChainConfig(chainId?: number): ChainConfig {
  if (chainId && CHAIN_CONFIG[chainId]) return CHAIN_CONFIG[chainId];
  return CHAIN_CONFIG[arcTestnet.id];
}

/** Hook: returns the active chain's config (contracts, tokens, native). */
export function useChainConfig(): ChainConfig {
  const id = useChainId();
  return getChainConfig(id);
}

// ---------- ABIs (chain-agnostic) ----------
export const ERC20_ABI = [
  { inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const ROUTER_ABI = [
  { inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "amountADesired", type: "uint256" }, { name: "amountBDesired", type: "uint256" }, { name: "amountAMin", type: "uint256" }, { name: "amountBMin", type: "uint256" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "addLiquidity", outputs: [{ name: "amountA", type: "uint256" }, { name: "amountB", type: "uint256" }, { name: "liquidity", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }, { name: "amountTokenDesired", type: "uint256" }, { name: "amountTokenMin", type: "uint256" }, { name: "amountETHMin", type: "uint256" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "addLiquidityETH", outputs: [{ name: "amountToken", type: "uint256" }, { name: "amountETH", type: "uint256" }, { name: "liquidity", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "liquidity", type: "uint256" }, { name: "amountAMin", type: "uint256" }, { name: "amountBMin", type: "uint256" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "removeLiquidity", outputs: [{ name: "amountA", type: "uint256" }, { name: "amountB", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }, { name: "liquidity", type: "uint256" }, { name: "amountTokenMin", type: "uint256" }, { name: "amountETHMin", type: "uint256" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "removeLiquidityETH", outputs: [{ name: "amountToken", type: "uint256" }, { name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "swapExactTokensForTokens", outputs: [{ name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "swapExactETHForTokens", outputs: [{ name: "amounts", type: "uint256[]" }], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "to", type: "address" }, { name: "deadline", type: "uint256" }], name: "swapExactTokensForETH", outputs: [{ name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amountIn", type: "uint256" }, { name: "path", type: "address[]" }], name: "getAmountsOut", outputs: [{ name: "amounts", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "amountA", type: "uint256" }, { name: "reserveA", type: "uint256" }, { name: "reserveB", type: "uint256" }], name: "quote", outputs: [{ name: "amountB", type: "uint256" }], stateMutability: "pure", type: "function" },
  { inputs: [], name: "WETH", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "factory", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
] as const;

export const FACTORY_ABI = [
  { inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], name: "createPair", outputs: [{ name: "pair", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], name: "getPair", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "allPairsLength", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }], name: "allPairs", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
] as const;

export const PAIR_ABI = [
  { inputs: [], name: "getReserves", outputs: [{ name: "reserve0", type: "uint112" }, { name: "reserve1", type: "uint112" }, { name: "blockTimestampLast", type: "uint32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "token0", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "token1", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;
