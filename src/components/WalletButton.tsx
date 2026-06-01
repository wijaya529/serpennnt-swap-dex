import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { arcTestnet } from "@/lib/web3/chain";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";

const WALLET_META: Record<string, { name: string; icon: string; description: string }> = {
  metaMask: { name: "MetaMask", icon: "🦊", description: "Most popular Ethereum wallet" },
  metaMaskSDK: { name: "MetaMask", icon: "🦊", description: "Most popular Ethereum wallet" },
  okxwallet: { name: "OKX Wallet", icon: "⚫", description: "Multi-chain wallet by OKX" },
  rabby: { name: "Rabby Wallet", icon: "🐰", description: "Security-first DeFi wallet" },
  injected: { name: "Browser Wallet", icon: "🌐", description: "Any injected EIP-1193 wallet" },
};

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);

  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            <AlertTriangle className="mr-1 h-4 w-4" /> Switch to Arc
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-premium text-primary-foreground font-semibold shadow-elegant hover:opacity-90">
          <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-gradient">Connect a wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {(() => {
            const seen = new Set<string>();
            const filtered = connectors.filter((c) => {
              const eth: any = typeof window !== "undefined" ? (window as any).ethereum : undefined;
              const okx: any = typeof window !== "undefined" ? (window as any).okxwallet : undefined;

              let key: string | null = null;
              if (c.id === "metaMask" || c.id === "metaMaskSDK") key = "metamask";
              else if (c.id === "okxwallet") key = okx ? "okx" : null;
              else if (c.id === "rabby") key = eth?.isRabby ? "rabby" : null;
              else if (c.id === "injected") {
                if (eth?.isRabby) key = "rabby";
                else if (eth?.isMetaMask && !eth?.isRabby) key = "metamask";
                else if (okx) key = "okx";
                else key = null;
              } else {
                key = null;
              }

              if (!key) return false;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            return filtered.map((c) => {
              const meta = WALLET_META[c.id] ?? { name: c.name, icon: "👛", description: "" };
              return (
              <button
                key={c.uid}
                disabled={isPending}
                onClick={() => {
                  connect({ connector: c, chainId: arcTestnet.id });
                  setOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                <div className="text-2xl">{meta.icon}</div>
                <div className="text-left flex-1">
                  <div className="font-semibold">{meta.name}</div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                </div>
              </button>
              );
            });
          })()}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          By connecting, you agree to interact with smart contracts on Arc Testnet (chain ID 5042002).
        </p>
      </DialogContent>
    </Dialog>
  );
}
