import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { Droplets, Loader2, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenSelector } from "@/components/TokenSelector";
import { ERC20_ABI, FAUCET_ABI, useChainConfig, type TokenInfo } from "@/lib/web3/contracts";
import { formatAmount } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/faucet")({
  component: FaucetPage,
  head: () => ({
    meta: [
      { title: "Faucet — Snake DEX" },
      { name: "description", content: "Claim testnet tokens on Arc Testnet." },
    ],
  }),
});

function FaucetPage() {
  const cfg = useChainConfig();
  const { address, isConnected } = useAccount();
  const faucetAddress = cfg.contracts.faucet;

  const tokens = useMemo(() => cfg.tokens.filter((t) => !t.isNative), [cfg.tokens]);
  const [token, setToken] = useState<TokenInfo>(tokens[0] ?? cfg.tokens[1] ?? cfg.tokens[0]);

  useEffect(() => {
    setToken(tokens[0] ?? cfg.tokens[1] ?? cfg.tokens[0]);
  }, [cfg.chainId]); // eslint-disable-line

  const { data: faucetAmount } = useReadContract({
    address: faucetAddress,
    abi: FAUCET_ABI,
    functionName: "faucetAmount",
  });

  const { data: owner } = useReadContract({
    address: faucetAddress,
    abi: FAUCET_ABI,
    functionName: "owner",
  });

  const { data: isAllowed, refetch: refetchAllowed } = useReadContract({
    address: faucetAddress,
    abi: FAUCET_ABI,
    functionName: "allowedTokens",
    args: token ? [token.address] : undefined,
    query: { enabled: !!token },
  });

  const { data: faucetBal, refetch: refetchBal } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [faucetAddress],
    query: { enabled: !!token },
  });

  const isOwner = !!owner && !!address && (owner as string).toLowerCase() === address.toLowerCase();

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Claim successful");
      refetchBal();
      reset();
    }
  }, [isSuccess]); // eslint-disable-line

  const claim = () => {
    if (!isConnected) return toast.error("Connect your wallet");
    if (!isAllowed) return toast.error("Token not enabled on faucet");
    writeContract(
      {
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "claimFaucet",
        args: [token.address],
      },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );
  };

  const amount = faucetAmount ? formatUnits(faucetAmount as bigint, token.decimals) : "0";
  const bal = faucetBal ? formatUnits(faucetBal as bigint, token.decimals) : "0";
  const canClaim = isAllowed && faucetBal && faucetAmount && (faucetBal as bigint) >= (faucetAmount as bigint);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-gradient flex items-center gap-2">
            <Droplets className="h-7 w-7" /> Token Faucet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Claim testnet tokens on {cfg.name}.</p>
        </div>
        {isOwner && (
          <Link
            to="/faucet/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            <Settings className="h-4 w-4" /> Admin
          </Link>
        )}
      </div>

      <div className="glass rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Token</label>
          <div className="mt-2">
            <TokenSelector value={token} onChange={setToken} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Claim amount" value={`${formatAmount(amount)} ${token.symbol}`} />
          <Stat label="Faucet balance" value={`${formatAmount(bal)} ${token.symbol}`} />
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs">
          Status:{" "}
          {isAllowed ? (
            <span className="text-primary font-semibold">Enabled</span>
          ) : (
            <span className="text-destructive font-semibold">Not enabled — contact admin</span>
          )}
        </div>

        <Button
          onClick={claim}
          disabled={!isConnected || isPending || isMining || !canClaim}
          className="w-full h-12 bg-premium text-primary-foreground font-semibold"
        >
          {isPending || isMining ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claiming…
            </>
          ) : !isConnected ? (
            "Connect wallet"
          ) : !isAllowed ? (
            "Token not enabled"
          ) : !canClaim ? (
            "Faucet empty"
          ) : (
            `Claim ${formatAmount(amount)} ${token.symbol}`
          )}
        </Button>

        <a
          href={`${cfg.explorer}/address/${faucetAddress}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View faucet contract <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
