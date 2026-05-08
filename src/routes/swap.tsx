import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { AlertCircle, ArrowDown, Loader2, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenSelector } from "@/components/TokenSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CONTRACTS, ERC20_ABI, NATIVE_TOKEN, ROUTER_ABI, TOKENS, type TokenInfo } from "@/lib/web3/contracts";
import { useTokenBalance } from "@/lib/web3/hooks";
import { formatAmount, trimDecimals } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/swap")({
  component: SwapPage,
  head: () => ({
    meta: [
      { title: "Swap — Snake DEX" },
      { name: "description", content: "Instant token swaps on Snake DEX, Arc Testnet." },
    ],
  }),
});

function wrapAddress(t: TokenInfo) {
  return t.isNative ? CONTRACTS.weth : t.address;
}

function SwapPage() {
  const { address, isConnected } = useAccount();
  const [tokenIn, setTokenIn] = useState<TokenInfo>(NATIVE_TOKEN);
  const [tokenOut, setTokenOut] = useState<TokenInfo>(TOKENS[2]);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [deadlineMin, setDeadlineMin] = useState("20");

  const balIn = useTokenBalance(tokenIn);
  const balOut = useTokenBalance(tokenOut);

  const path = useMemo<`0x${string}`[]>(() => {
    const a = wrapAddress(tokenIn);
    const b = wrapAddress(tokenOut);
    if (a.toLowerCase() === b.toLowerCase()) return [];
    return [a, b];
  }, [tokenIn, tokenOut]);

  const parsedIn = useMemo(() => {
    try {
      return amountIn ? parseUnits(amountIn, tokenIn.decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amountIn, tokenIn.decimals]);

  const { data: amountsOut, isFetching: quoting, error: quoteError } = useReadContract({
    address: CONTRACTS.router,
    abi: ROUTER_ABI,
    functionName: "getAmountsOut",
    args: parsedIn > 0n && path.length === 2 ? [parsedIn, path] : undefined,
    query: { enabled: parsedIn > 0n && path.length === 2, retry: 1 },
  });

  const amountOut = (amountsOut as bigint[] | undefined)?.[1] ?? 0n;
  const formattedOut = amountOut > 0n ? formatUnits(amountOut, tokenOut.decimals) : "";
  const noLiquidity = !!quoteError && parsedIn > 0n;

  const minOut = useMemo(() => {
    const slip = Math.max(0, Math.min(50, parseFloat(slippage) || 0));
    return (amountOut * BigInt(Math.floor((100 - slip) * 100))) / 10000n;
  }, [amountOut, slippage]);

  const { data: allowance, refetch: refetchAllowance, isLoading: allowanceLoading } = useReadContract({
    address: tokenIn.isNative ? undefined : tokenIn.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.router] : undefined,
    query: { enabled: !!address && !tokenIn.isNative },
  });

  const allowanceReady = tokenIn.isNative || allowance !== undefined;
  const needsApproval = !tokenIn.isNative && (allowance as bigint | undefined ?? 0n) < parsedIn;

  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient();

  useEffect(() => {
    if (isSuccess && txHash) {
      toast.success("Transaction confirmed");
      balIn.refetch();
      balOut.refetch();
      refetchAllowance();
      setAmountIn("");
      setTxHash(undefined);
    }
  }, [isSuccess, txHash]);

  const onApprove = async () => {
    try {
      const hash = await writeContractAsync({
        address: tokenIn.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.router, maxUint256],
      });
      setTxHash(hash);
      toast.info("Approving token…");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Approval failed");
    }
  };

  const onSwap = async () => {
    if (!address) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + (parseInt(deadlineMin) || 20) * 60);
    try {
      let hash: `0x${string}`;
      if (tokenIn.isNative) {
        hash = await writeContractAsync({
          address: CONTRACTS.router,
          abi: ROUTER_ABI,
          functionName: "swapExactETHForTokens",
          args: [minOut, path, address, deadline],
          value: parsedIn,
        });
      } else if (tokenOut.isNative) {
        hash = await writeContractAsync({
          address: CONTRACTS.router,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForETH",
          args: [parsedIn, minOut, path, address, deadline],
        });
      } else {
        hash = await writeContractAsync({
          address: CONTRACTS.router,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [parsedIn, minOut, path, address, deadline],
        });
      }
      setTxHash(hash);
      toast.info("Swap submitted…");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Swap failed");
    }
  };

  const flip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
  };

  const insufficient = parsedIn > balIn.value;
  const samePair = path.length === 0;
  const busy = writing || confirming || quoting;

  const price = parsedIn > 0n && amountOut > 0n
    ? (Number(formattedOut) / Number(amountIn)).toFixed(6)
    : null;

  return (
    <div className="max-w-md mx-auto">
      <div className="glass rounded-3xl p-6 shadow-elegant">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-semibold">Swap</h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="glass w-72">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Slippage tolerance (%)</Label>
                  <Input value={slippage} onChange={(e) => setSlippage(e.target.value)} type="number" step="0.1" />
                </div>
                <div>
                  <Label className="text-xs">Deadline (minutes)</Label>
                  <Input value={deadlineMin} onChange={(e) => setDeadlineMin(e.target.value)} type="number" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <TokenPanel label="From" token={tokenIn} setToken={setTokenIn} amount={amountIn} setAmount={setAmountIn} balance={balIn.formatted} other={tokenOut} />

        <div className="flex justify-center -my-2 relative z-10">
          <button onClick={flip} className="h-10 w-10 rounded-xl bg-secondary border-4 border-card hover:bg-primary/20 flex items-center justify-center transition-colors">
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>

        <TokenPanel
          label="To (estimated)"
          token={tokenOut}
          setToken={setTokenOut}
          amount={trimDecimals(formattedOut, 6)}
          displayAmount={formatAmount(formattedOut)}
          setAmount={() => {}}
          balance={balOut.formatted}
          other={tokenIn}
          readOnly
          loading={quoting && parsedIn > 0n}
        />

        {noLiquidity ? (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">No route found</div>
              <div className="text-destructive/80 mt-0.5">Pair {tokenIn.symbol}/{tokenOut.symbol} has no liquidity yet. Try a different pair or add liquidity first.</div>
            </div>
          </div>
        ) : quoting && parsedIn > 0n ? (
          <div className="mt-4 rounded-xl bg-secondary/30 border border-border/40 px-3 py-2.5 space-y-2">
            <div className="flex justify-between items-center"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-32" /></div>
            <div className="flex justify-between items-center"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-28" /></div>
          </div>
        ) : (price || amountOut > 0n) ? (
          <div className="mt-4 rounded-xl bg-secondary/30 border border-border/40 px-3 py-2.5 space-y-1.5 text-xs tabular-nums">
            {price && (
              <div className="flex justify-between text-muted-foreground">
                <span>Price</span>
                <span className="text-foreground/90">1 {tokenIn.symbol} ≈ <span className="font-medium">{formatAmount(price)}</span> {tokenOut.symbol}</span>
              </div>
            )}
            {amountOut > 0n && (
              <div className="flex justify-between text-muted-foreground">
                <span>Min received ({slippage}%)</span>
                <span className="text-foreground/90"><span className="font-medium">{formatAmount(formatUnits(minOut, tokenOut.decimals))}</span> {tokenOut.symbol}</span>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6">
          {!isConnected ? (
            <Button disabled className="w-full h-14 text-base bg-premium text-primary-foreground">Connect wallet to swap</Button>
          ) : samePair ? (
            <Button disabled className="w-full h-14 text-base">Select different tokens</Button>
          ) : !parsedIn ? (
            <Button disabled className="w-full h-14 text-base">Enter an amount</Button>
          ) : insufficient ? (
            <Button disabled className="w-full h-14 text-base" variant="destructive">Insufficient {tokenIn.symbol}</Button>
          ) : noLiquidity ? (
            <Button disabled className="w-full h-14 text-base" variant="destructive">No liquidity for this pair</Button>
          ) : quoting ? (
            <Button disabled className="w-full h-14 text-base bg-premium text-primary-foreground/80">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching best price…
            </Button>
          ) : !allowanceReady && allowanceLoading ? (
            <Button disabled className="w-full h-14 text-base">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking allowance…
            </Button>
          ) : needsApproval ? (
            <Button onClick={onApprove} disabled={busy} className="w-full h-14 text-base bg-premium text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Approve ${tokenIn.symbol}`}
            </Button>
          ) : (
            <Button onClick={onSwap} disabled={busy || amountOut === 0n} className="w-full h-14 text-base bg-premium text-primary-foreground font-semibold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Swap"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TokenPanel({
  label, token, setToken, amount, displayAmount, setAmount, balance, other, readOnly,
}: {
  label: string; token: TokenInfo; setToken: (t: TokenInfo) => void;
  amount: string; displayAmount?: string; setAmount: (s: string) => void; balance: string; other: TokenInfo; readOnly?: boolean;
}) {
  const usdLike = amount && Number(amount) > 0 ? formatAmount(amount) : "0";
  return (
    <div className="group rounded-2xl bg-secondary/30 hover:bg-secondary/40 border border-border/40 hover:border-primary/30 p-4 transition-all duration-200">
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
        <span className="uppercase tracking-wider text-[10px] font-medium">{label}</span>
        <button
          onClick={() => !readOnly && setAmount(trimDecimals(balance, 6))}
          className="hover:text-primary transition-colors tabular-nums flex items-center gap-1.5"
          disabled={readOnly}
        >
          <span>Balance:</span>
          <span className="font-medium text-foreground/80">{formatAmount(balance)}</span>
          {!readOnly && Number(balance) > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">MAX</span>
          )}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Input
          value={readOnly ? (displayAmount ?? amount) : amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          readOnly={readOnly}
          inputMode="decimal"
          className="border-0 bg-transparent text-3xl font-semibold tracking-tight tabular-nums p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
          style={{ fontFeatureSettings: '"tnum", "cv11"', WebkitFontSmoothing: "antialiased" }}
        />
        <TokenSelector value={token} onChange={setToken} exclude={other} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground/70 tabular-nums">
        ≈ {usdLike} {token.symbol}
      </div>
    </div>
  );
}
