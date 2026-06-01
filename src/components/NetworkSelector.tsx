import { useChainId, useSwitchChain, useAccount } from "wagmi";
import { CHAIN_CONFIG, SUPPORTED_CHAIN_IDS, getChainConfig } from "@/lib/web3/contracts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NetworkSelector() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { isConnected } = useAccount();
  const active = getChainConfig(chainId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-border/60 bg-card/40 hover:border-primary/60 hover:bg-primary/5 backdrop-blur"
          disabled={isPending}
        >
          <img
            src={active.logo}
            alt={active.name}
            className="h-5 w-5 rounded-full"
          />
          <span className="hidden sm:inline font-medium tracking-tight">{active.shortName}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass min-w-[220px] p-1.5">
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Select Network
        </div>
        {SUPPORTED_CHAIN_IDS.map((id) => {
          const c = CHAIN_CONFIG[id];
          const isActive = id === active.chainId;
          return (
            <DropdownMenuItem
              key={id}
              onClick={() => {
                if (isActive) return;
                if (isConnected) switchChain({ chainId: id });
                else {
                  // Without a connected wallet, wagmi still tracks chainId via the config; reload to pick up default chain.
                  // For UX, just call switchChain anyway — wagmi will throw silently when no connector.
                  try { switchChain({ chainId: id }); } catch { /* ignore */ }
                }
              }}
              className="gap-3 rounded-lg px-2 py-2 cursor-pointer focus:bg-primary/10"
            >
              <img src={c.logo} alt={c.name} className="h-6 w-6 rounded-full ring-1 ring-border/60" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">Chain ID {c.chainId}</div>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
