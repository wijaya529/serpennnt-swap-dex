import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, type Connector } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SUPPORTED_CHAIN_IDS, getChainConfig } from "@/lib/web3/contracts";
import { Wallet, LogOut, AlertTriangle, Globe } from "lucide-react";
import metamaskLogo from "@/assets/wallets/metamask.svg.asset.json";
import okxLogo from "@/assets/wallets/okx.png.asset.json";
import rabbyLogo from "@/assets/wallets/rabby.png.asset.json";

type WalletKey = "metamask" | "okx" | "rabby" | "browser";

const WALLET_META: Record<WalletKey, { name: string; description: string; logo?: string }> = {
  metamask: { name: "MetaMask", description: "Most popular Ethereum wallet", logo: metamaskLogo.url },
  okx: { name: "OKX Wallet", description: "Multi-chain wallet by OKX", logo: okxLogo.url },
  rabby: { name: "Rabby Wallet", description: "Security-first DeFi wallet", logo: rabbyLogo.url },
  browser: { name: "Browser Wallet", description: "Any injected EIP-1193 wallet" },
};

const ORDER: WalletKey[] = ["metamask", "okx", "rabby", "browser"];

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function pickConnectors(connectors: readonly Connector[]): Array<{ key: WalletKey; connector: Connector }> {
  const eth: any = typeof window !== "undefined" ? (window as any).ethereum : undefined;
  const hasOkx = typeof window !== "undefined" && !!(window as any).okxwallet;
  const hasRabby = !!eth?.isRabby;

  const byId = (id: string) => connectors.find((c) => c.id === id);
  const injected = connectors.find((c) => c.id === "injected");

  const picks: Partial<Record<WalletKey, Connector>> = {};

  const mm = byId("metaMask") ?? byId("metaMaskSDK");
  if (mm) picks.metamask = mm;
  else if (injected && eth?.isMetaMask && !hasRabby) picks.metamask = injected;

  const okx = byId("okxwallet");
  if (hasOkx && okx) picks.okx = okx;

  const rabby = byId("rabby");
  if (hasRabby && rabby) picks.rabby = rabby;
  else if (hasRabby && injected && !picks.rabby) picks.rabby = injected;

  if (injected) picks.browser = injected;

  return ORDER.filter((k) => picks[k]).map((k) => ({ key: k, connector: picks[k]! }));
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);

  const activeCfg = getChainConfig(chainId);
  const wrongNetwork = isConnected && !SUPPORTED_CHAIN_IDS.includes(chainId);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchChain({ chainId: activeCfg.chainId as 5042002 })}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            <AlertTriangle className="mr-1 h-4 w-4" /> Switch to {activeCfg.shortName}
          </Button>
        )}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg glass">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-mono">{short(address)}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => disconnect()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const list = pickConnectors(connectors);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-premium text-primary-foreground font-semibold shadow-elegant hover:opacity-90">
          <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border max-w-md backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-gradient">Connect a wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {list.map(({ key, connector }) => {
            const meta = WALLET_META[key];
            return (
              <button
                key={key}
                disabled={isPending}
                onClick={() => {
                  connect({ connector, chainId: activeCfg.chainId as 5042002 });
                  setOpen(false);
                }}
                className="group w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/40 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.45)] transition-all duration-200 disabled:opacity-50 hover:-translate-y-0.5"
              >
                <div className="h-10 w-10 rounded-lg bg-background/60 ring-1 ring-border/60 flex items-center justify-center overflow-hidden shrink-0 group-hover:ring-primary/40 transition-all">
                  {meta.logo ? (
                    <img
                      src={meta.logo}
                      alt={`${meta.name} logo`}
                      className="h-7 w-7 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Globe className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold tracking-tight">{meta.name}</div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Active network: <span className="text-foreground/80 font-medium">{activeCfg.name}</span> (chain ID {activeCfg.chainId}). Switch networks from the selector.
        </p>
      </DialogContent>
    </Dialog>
  );
}
