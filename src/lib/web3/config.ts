import { http, createConfig } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { arcTestnet, iopnTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [arcTestnet, iopnTestnet],
  connectors: [
    metaMask({ dappMetadata: { name: "Snake DEX" } }),
    injected({ target: "metaMask" }),
    injected({
      target: () => ({
        id: "okxwallet",
        name: "OKX Wallet",
        provider: typeof window !== "undefined" ? (window as any).okxwallet : undefined,
      }),
    }),
    injected({
      target: () => ({
        id: "rabby",
        name: "Rabby Wallet",
        provider:
          typeof window !== "undefined" && (window as any).ethereum?.isRabby
            ? (window as any).ethereum
            : undefined,
      }),
    }),
    injected(),
  ],
  transports: {
    [arcTestnet.id]: http(),
    [iopnTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
