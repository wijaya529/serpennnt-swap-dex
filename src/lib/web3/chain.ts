import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const iopnTestnet = defineChain({
  id: 984,
  name: "IOPN Testnet",
  nativeCurrency: { name: "OPN", symbol: "OPN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc2.iopn.tech"] },
  },
  blockExplorers: {
    default: { name: "IOPN Explorer", url: "https://testnet.iopn.tech" },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [arcTestnet, iopnTestnet] as const;
export const DEFAULT_CHAIN = arcTestnet;
