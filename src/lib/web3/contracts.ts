export const CONTRACTS = {
  factory: "0x903211E8207A66b0e850CB08322198FF4b972BdF" as const,
  weth: "0xAad965DAD0eF78198426abD83339E61713188496" as const,
  router: "0x6A0257A3A9DD69f5eC8BB0a5c469CE17b003B643" as const,
  library: "0x28C96a2Aa02ed9e22b000a336684137B19E426B7" as const,
  multicall: "0x18efD372cab9d9ff31089b8f28E967Ce87Dd6B65" as const,
};

export type TokenInfo = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  isNative?: boolean;
};

// Logos from CoinMarketCap CDN
const cmc = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;

export const NATIVE_TOKEN: TokenInfo = {
  address: "0x0000000000000000000000000000000000000000",
  symbol: "USDC",
  name: "USDC (Native)",
  decimals: 18,
  logo: cmc(3408),
  isNative: true,
};

export const TOKENS: TokenInfo[] = [
  NATIVE_TOKEN,
  {
    address: CONTRACTS.weth,
    symbol: "WUSDC",
    name: "Wrapped USDC",
    decimals: 18,
    logo: cmc(3408),
  },
  {
    address: "0xA95648526E7Bac1Bf6FDf70e84A59EA180D913d8",
    symbol: "BERA",
    name: "Berachain",
    decimals: 18,
    logo: cmc(24647),
  },
  {
    address: "0x6914F7ffAb2008863ce5a96291Ef5fAE1253B6a3",
    symbol: "TON",
    name: "Toncoin",
    decimals: 18,
    logo: cmc(11419),
  },
  {
    address: "0xDF1e9F36BbB046EfCfa9097127d4a47309aDDc2d",
    symbol: "HYPE",
    name: "Hyperliquid",
    decimals: 18,
    logo: cmc(32196),
  },
  {
    address: "0x4dc1c2525c79B9Ee3c8491ec6ac336BbED7aC3dF",
    symbol: "BNB",
    name: "BNB",
    decimals: 18,
    logo: cmc(1839),
  },
];

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
