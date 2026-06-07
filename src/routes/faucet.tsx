import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { Droplets, Loader2, Settings, ExternalLink, CheckCircle2, XCircle, Wallet, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ERC20_ABI, FAUCET_ABI, useChainConfig, type TokenInfo } from "@/lib/web3/contracts";
import { formatAmount } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/faucet")({
  component: FaucetPage,
  head: () => ({
    meta: [
      { title: "Faucet — Snake DEX" },
      { name: "description", content: "Claim free testnet tokens on Arc Testnet to start trading on Snake DEX." },
    ],
  }),
});

function FaucetPage() {
  const cfg = useChainConfig();
  const { address, isConnected } = useAccount();
  const faucet = cfg.contracts.faucet;
  const tokens = useMemo(() => cfg.tokens.filter((t) => !t.isNative), [cfg.tokens]);

  const { data: meta } = useReadContracts({
    contracts: [
      { address: faucet, abi: FAUCET_ABI, functionName: "faucetAmount" },
      { address: faucet, abi: FAUCET_ABI, functionName: "owner" },
    ],
  });
  const faucetAmount = meta?.[0]?.result as bigint | undefined;
  const owner = meta?.[1]?.result as string | undefined;
  const isOwner = !!owner && !!address && owner.toLowerCase() === address.toLowerCase();

  // Batched: per-token allowed flag, faucet's balance, user's balance
  const { data: tokenStats, refetch: refetchStats } = useReadContracts({
    allowFailure: true,
    contracts: tokens.flatMap((t) => [
      { address: faucet, abi: FAUCET_ABI, functionName: "allowedTokens", args: [t.address] } as const,
      { address: t.address, abi: ERC20_ABI, functionName: "balanceOf", args: [faucet] } as const,
      { address: t.address, abi: ERC20_ABI, functionName: "balanceOf", args: address ? [address] : [faucet] } as const,
    ]),
    query: { refetchInterval: 15_000 },
  });

  const rows = tokens.map((t, i) => {
    const allowed = (tokenStats?.[i * 3]?.result as boolean | undefined) ?? false;
    const fbal = (tokenStats?.[i * 3 + 1]?.result as bigint | undefined) ?? 0n;
    const ubal = address ? ((tokenStats?.[i * 3 + 2]?.result as bigint | undefined) ?? 0n) : 0n;
    return { token: t, allowed, faucetBal: fbal, userBal: ubal };
  });

  const [claiming, setClaiming] = useState<string | null>(null);
  const { writeContract, data: hash, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Tokens claimed successfully");
      refetchStats();
      setClaiming(null);
      reset();
    }
  }, [isSuccess]); // eslint-disable-line

  const claim = (t: TokenInfo, allowed: boolean, fbal: bigint) => {
    if (!isConnected) return toast.error("Connect your wallet first");
    if (!allowed) return toast.error(`${t.symbol} is not enabled on the faucet`);
    if (faucetAmount && fbal < faucetAmount) return toast.error("Faucet is empty for this token");
    setClaiming(t.address);
    writeContract(
      { address: faucet, abi: FAUCET_ABI, functionName: "claimFaucet", args: [t.address] },
      {
        onError: (e) => {
          toast.error(e.message.split("\n")[0]);
          setClaiming(null);
        },
      }
    );
  };

  const copyFaucet = () => {
    navigator.clipboard.writeText(faucet);
    toast.success("Faucet address copied");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <div className="glass rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Droplets className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display text-gradient">Token Faucet</h1>
              <p className="text-sm text-muted-foreground">Free testnet tokens on {cfg.name} — claim to start trading.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              onClick={copyFaucet}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 hover:bg-muted/50"
              title={faucet}
            >
              <Copy className="h-3 w-3" />
              <span className="font-mono">{faucet.slice(0, 6)}…{faucet.slice(-4)}</span>
            </button>
            <a
              href={`${cfg.explorer}/address/${faucet}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 hover:bg-muted/50"
            >
              <ExternalLink className="h-3 w-3" /> View on ArcScan
            </a>
          </div>
        </div>
        {isOwner && (
          <Link
            to="/faucet/admin"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20"
          >
            <Settings className="h-4 w-4" /> Admin Panel
          </Link>
        )}
      </div>

      {/* Connect notice */}
      {!isConnected && (
        <div className="glass rounded-xl p-4 flex items-center gap-3 text-sm">
          <Wallet className="h-5 w-5 text-primary" />
          Connect your wallet to claim tokens.
        </div>
      )}

      {/* Token grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ token, allowed, faucetBal, userBal }) => {
          const claimDisplay = faucetAmount ? formatUnits(faucetAmount, token.decimals) : "0";
          const fbalDisplay = formatUnits(faucetBal, token.decimals);
          const ubalDisplay = formatUnits(userBal, token.decimals);
          const empty = !!faucetAmount && faucetBal < faucetAmount;
          const isThisClaiming = claiming === token.address && (isMining || !isSuccess);
          const busy = isThisClaiming;
          return (
            <div
              key={token.address}
              className="glass rounded-2xl p-5 flex flex-col gap-4 transition hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={token.logo} alt={token.symbol} className="h-10 w-10 rounded-full" />
                  <div>
                    <div className="font-semibold">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">{token.name}</div>
                  </div>
                </div>
                {allowed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    <XCircle className="h-3 w-3" /> Disabled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Per claim</div>
                  <div className="mt-0.5 font-semibold">{formatAmount(claimDisplay)}</div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Faucet pool</div>
                  <div className={`mt-0.5 font-semibold ${empty ? "text-destructive" : ""}`}>
                    {formatAmount(fbalDisplay)}
                  </div>
                </div>
              </div>

              {isConnected && (
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Your balance</span>
                  <span className="font-mono text-foreground">{formatAmount(ubalDisplay)} {token.symbol}</span>
                </div>
              )}

              <Button
                onClick={() => claim(token, allowed, faucetBal)}
                disabled={!isConnected || !allowed || empty || busy}
                className="w-full bg-premium text-primary-foreground font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claiming…
                  </>
                ) : !allowed ? (
                  "Not available"
                ) : empty ? (
                  "Faucet empty"
                ) : (
                  `Claim ${formatAmount(claimDisplay)} ${token.symbol}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-3">How it works</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Connect your wallet to {cfg.name} (Chain ID {cfg.chainId}).</li>
          <li>Pick a token from the list above — only "Active" tokens can be claimed.</li>
          <li>Click <span className="text-foreground font-medium">Claim</span> and confirm the transaction in your wallet.</li>
          <li>Use the received tokens to Swap, Create Pool, or Add Liquidity on Snake DEX.</li>
        </ol>
      </div>
    </div>
  );
}
