import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256, zeroAddress } from "viem";
import { Plus, Minus, Loader2 } from "lucide-react";
import { TokenSelector } from "@/components/TokenSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CONTRACTS, ERC20_ABI, FACTORY_ABI, NATIVE_TOKEN, PAIR_ABI, ROUTER_ABI, TOKENS, type TokenInfo } from "@/lib/web3/contracts";
import { useTokenBalance } from "@/lib/web3/hooks";
import { formatAmount, trimDecimals } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/liquidity")({
  component: LiquidityPage,
  head: () => ({
    meta: [
      { title: "Liquidity — Snake DEX" },
      { name: "description", content: "Add or remove liquidity to earn fees on Snake DEX." },
    ],
  }),
});

const wrapAddr = (t: TokenInfo) => (t.isNative ? CONTRACTS.weth : t.address);

function LiquidityPage() {
  const [tab, setTab] = useState("add");
  return (
    <div className="max-w-md mx-auto">
      <div className="glass rounded-3xl p-6 shadow-elegant">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="add">Add</TabsTrigger>
            <TabsTrigger value="remove">Remove</TabsTrigger>
          </TabsList>
          <TabsContent value="add"><AddLiquidity /></TabsContent>
          <TabsContent value="remove"><RemoveLiquidity /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AddLiquidity() {
  const { address, isConnected } = useAccount();
  const [tokenA, setTokenA] = useState<TokenInfo>(NATIVE_TOKEN);
  const [tokenB, setTokenB] = useState<TokenInfo>(TOKENS[2]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  const balA = useTokenBalance(tokenA);
  const balB = useTokenBalance(tokenB);

  const { data: pairAddr, refetch: refetchPair } = useReadContract({
    address: CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [wrapAddr(tokenA), wrapAddr(tokenB)],
  });

  const pairExists = pairAddr && pairAddr !== zeroAddress;
  const [justCreated, setJustCreated] = useState(false);

  const { data: reservesData, refetch: refetchReserves } = useReadContracts({
    contracts: pairExists
      ? [
          { address: pairAddr as `0x${string}`, abi: PAIR_ABI, functionName: "getReserves" },
          { address: pairAddr as `0x${string}`, abi: PAIR_ABI, functionName: "token0" },
        ]
      : [],
    query: { enabled: !!pairExists },
  });

  const reserves = reservesData?.[0]?.result as readonly [bigint, bigint, number] | undefined;
  const token0 = reservesData?.[1]?.result as `0x${string}` | undefined;

  useEffect(() => {
    if (!reserves || !token0 || !amountA) return;
    try {
      const aIn = parseUnits(amountA, tokenA.decimals);
      const aIsToken0 = wrapAddr(tokenA).toLowerCase() === token0.toLowerCase();
      const reserveA = aIsToken0 ? reserves[0] : reserves[1];
      const reserveB = aIsToken0 ? reserves[1] : reserves[0];
      if (reserveA === 0n) return;
      const bOut = (aIn * reserveB) / reserveA;
      setAmountB(formatUnits(bOut, tokenB.decimals));
    } catch {}
  }, [amountA, reserves, token0, tokenA, tokenB]);

  const parsedA = useMemo(() => { try { return amountA ? parseUnits(amountA, tokenA.decimals) : 0n; } catch { return 0n; } }, [amountA, tokenA]);
  const parsedB = useMemo(() => { try { return amountB ? parseUnits(amountB, tokenB.decimals) : 0n; } catch { return 0n; } }, [amountB, tokenB]);

  const { data: allowA, refetch: refA } = useReadContract({
    address: tokenA.isNative ? undefined : tokenA.address,
    abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, CONTRACTS.router] : undefined,
    query: { enabled: !!address && !tokenA.isNative },
  });
  const { data: allowB, refetch: refB } = useReadContract({
    address: tokenB.isNative ? undefined : tokenB.address,
    abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, CONTRACTS.router] : undefined,
    query: { enabled: !!address && !tokenB.isNative },
  });

  const needA = !tokenA.isNative && (allowA as bigint | undefined ?? 0n) < parsedA;
  const needB = !tokenB.isNative && (allowB as bigint | undefined ?? 0n) < parsedB;

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [txKind, setTxKind] = useState<"create" | "approve" | "add" | null>(null);
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Poll for pair detection after a Create Pair tx confirms — beats RPC indexing lag.
  useEffect(() => {
    if (!isSuccess) return;
    if (txKind === "create") {
      toast.success("Pair created — ready to add liquidity");
      setJustCreated(true);
      const run = () => { refetchPair(); refetchReserves(); };
      run();
      const t1 = setTimeout(run, 1200);
      const t2 = setTimeout(run, 3000);
      const t3 = setTimeout(run, 6000);
      setHash(undefined); setTxKind(null);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    if (txKind === "add") toast.success("Liquidity added");
    else if (txKind === "approve") toast.success("Approved");
    balA.refetch(); balB.refetch(); refA(); refB(); refetchReserves();
    if (txKind === "add") { setAmountA(""); setAmountB(""); }
    setHash(undefined); setTxKind(null);
  }, [isSuccess]);

  // Clear "just created" highlight once the pair is detected on-chain.
  useEffect(() => {
    if (pairExists && justCreated) {
      const t = setTimeout(() => setJustCreated(false), 2500);
      return () => clearTimeout(t);
    }
  }, [pairExists, justCreated]);

  const approve = async (t: TokenInfo) => {
    try {
      const h = await writeContractAsync({ address: t.address, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.router, maxUint256] });
      setTxKind("approve"); setHash(h); toast.info(`Approving ${t.symbol}…`);
    } catch (e: any) { toast.error(e?.shortMessage || "Approval failed"); }
  };

  const addLiquidity = async () => {
    if (!address) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const slipBps = 9950n;
    try {
      let h: `0x${string}`;
      if (tokenA.isNative || tokenB.isNative) {
        const tok = tokenA.isNative ? tokenB : tokenA;
        const nativeAmt = tokenA.isNative ? parsedA : parsedB;
        const tokAmt = tokenA.isNative ? parsedB : parsedA;
        h = await writeContractAsync({
          address: CONTRACTS.router, abi: ROUTER_ABI, functionName: "addLiquidityETH",
          args: [tok.address, tokAmt, (tokAmt * slipBps) / 10000n, (nativeAmt * slipBps) / 10000n, address, deadline],
          value: nativeAmt,
        });
      } else {
        h = await writeContractAsync({
          address: CONTRACTS.router, abi: ROUTER_ABI, functionName: "addLiquidity",
          args: [tokenA.address, tokenB.address, parsedA, parsedB, (parsedA * slipBps) / 10000n, (parsedB * slipBps) / 10000n, address, deadline],
        });
      }
      setTxKind("add"); setHash(h); toast.info("Adding liquidity…");
    } catch (e: any) { toast.error(e?.shortMessage || "Failed"); }
  };

  const createPair = async () => {
    try {
      const h = await writeContractAsync({
        address: CONTRACTS.factory, abi: FACTORY_ABI, functionName: "createPair",
        args: [wrapAddr(tokenA), wrapAddr(tokenB)],
      });
      setTxKind("create"); setHash(h); toast.info("Creating pair…");
    } catch (e: any) { toast.error(e?.shortMessage || "Failed"); }
  };

  const creating = txKind === "create" && (isPending || confirming);
  const detectingPair = (isSuccess && txKind === "create") || (justCreated && !pairExists);

  const busy = isPending || confirming;
  const insuff = parsedA > balA.value || parsedB > balB.value;

  return (
    <>
      <h1 className="text-2xl font-display font-semibold mb-6">Add Liquidity</h1>
      <Panel label="Token A" token={tokenA} setToken={setTokenA} amount={amountA} setAmount={setAmountA} balance={balA.formatted} other={tokenB} />
      <div className="flex justify-center my-2"><div className="h-10 w-10 rounded-xl bg-secondary border-4 border-card flex items-center justify-center"><Plus className="h-4 w-4" /></div></div>
      <Panel label="Token B" token={tokenB} setToken={setTokenB} amount={amountB} setAmount={setAmountB} balance={balB.formatted} other={tokenA} />

      {pairExists && reserves && (
        <div className="mt-4 rounded-xl bg-secondary/30 border border-border/40 px-3 py-2.5 text-xs tabular-nums">
          <div className="flex justify-between text-muted-foreground">
            <span>Pool reserves</span>
            <span className="text-foreground/90 font-medium">
              {formatAmount(formatUnits(reserves[0], 18))} / {formatAmount(formatUnits(reserves[1], 18))}
            </span>
          </div>
        </div>
      )}

      {justCreated && pairExists && (
        <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-bottom-1 duration-500">
          ✓ Pair created on-chain — you can now add liquidity.
        </div>
      )}

      <div className="mt-6 space-y-2">
        {!isConnected ? (
          <Button disabled className="w-full h-14">Connect wallet</Button>
        ) : detectingPair ? (
          <Button disabled className="w-full h-14 bg-premium text-primary-foreground/80">
            <Loader2 className="animate-spin h-4 w-4 mr-2" /> Detecting new pair…
          </Button>
        ) : !pairExists ? (
          <Button onClick={createPair} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground">
            {creating ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Creating pair…</> : "Create pair"}
          </Button>
        ) : !parsedA || !parsedB ? (
          <Button disabled className="w-full h-14 transition-all">Enter amounts</Button>
        ) : insuff ? (
          <Button disabled variant="destructive" className="w-full h-14">Insufficient balance</Button>
        ) : needA ? (
          <Button onClick={() => approve(tokenA)} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground">
            {busy ? <Loader2 className="animate-spin h-4 w-4" /> : `Approve ${tokenA.symbol}`}
          </Button>
        ) : needB ? (
          <Button onClick={() => approve(tokenB)} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground">
            {busy ? <Loader2 className="animate-spin h-4 w-4" /> : `Approve ${tokenB.symbol}`}
          </Button>
        ) : (
          <Button onClick={addLiquidity} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground font-semibold">
            {busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Add Liquidity"}
          </Button>
        )}
      </div>
    </>
  );
}

function RemoveLiquidity() {
  const { address, isConnected } = useAccount();
  const [tokenA, setTokenA] = useState<TokenInfo>(NATIVE_TOKEN);
  const [tokenB, setTokenB] = useState<TokenInfo>(TOKENS[2]);
  const [percent, setPercent] = useState(25);

  const { data: pairAddr, refetch: refetchPair } = useReadContract({
    address: CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [wrapAddr(tokenA), wrapAddr(tokenB)],
  });

  const pairExists = pairAddr && pairAddr !== zeroAddress;
  const pair = pairExists ? (pairAddr as `0x${string}`) : undefined;

  const { data: pairData, refetch: refetchPairData } = useReadContracts({
    contracts: pair && address
      ? [
          { address: pair, abi: PAIR_ABI, functionName: "balanceOf", args: [address] },
          { address: pair, abi: PAIR_ABI, functionName: "totalSupply" },
          { address: pair, abi: PAIR_ABI, functionName: "getReserves" },
          { address: pair, abi: PAIR_ABI, functionName: "token0" },
          { address: pair, abi: ERC20_ABI, functionName: "allowance", args: [address, CONTRACTS.router] },
        ]
      : [],
    query: { enabled: !!pair && !!address },
  });

  const lpBal = (pairData?.[0]?.result as bigint | undefined) ?? 0n;
  const totalSupply = (pairData?.[1]?.result as bigint | undefined) ?? 0n;
  const reserves = pairData?.[2]?.result as readonly [bigint, bigint, number] | undefined;
  const token0 = pairData?.[3]?.result as `0x${string}` | undefined;
  const lpAllowance = (pairData?.[4]?.result as bigint | undefined) ?? 0n;

  const lpToRemove = (lpBal * BigInt(percent)) / 100n;
  const needsApprove = lpToRemove > 0n && lpAllowance < lpToRemove;

  const { amountAOut, amountBOut } = useMemo(() => {
    if (!reserves || !token0 || totalSupply === 0n) return { amountAOut: 0n, amountBOut: 0n };
    const aIsToken0 = wrapAddr(tokenA).toLowerCase() === token0.toLowerCase();
    const rA = aIsToken0 ? reserves[0] : reserves[1];
    const rB = aIsToken0 ? reserves[1] : reserves[0];
    return {
      amountAOut: (lpToRemove * rA) / totalSupply,
      amountBOut: (lpToRemove * rB) / totalSupply,
    };
  }, [reserves, token0, totalSupply, lpToRemove, tokenA]);

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [txKind, setTxKind] = useState<"approve" | "remove" | null>(null);
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    toast.success(txKind === "approve" ? "LP approved" : txKind === "remove" ? "Liquidity removed" : "Confirmed");
    // Immediate refetch + a couple of follow-ups to beat RPC indexing lag
    const run = () => { refetchPair(); refetchPairData(); };
    run();
    const t1 = setTimeout(run, 1500);
    const t2 = setTimeout(run, 4000);
    setHash(undefined);
    setTxKind(null);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isSuccess]);

  const approveLP = async () => {
    if (!pair) return;
    try {
      const h = await writeContractAsync({ address: pair, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.router, maxUint256] });
      setTxKind("approve"); setHash(h); toast.info("Approving LP token…");
    } catch (e: any) { toast.error(e?.shortMessage || "Approval failed"); }
  };


  const remove = async () => {
    if (!address || !pair) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const slipBps = 9500n;
    try {
      let h: `0x${string}`;
      if (tokenA.isNative || tokenB.isNative) {
        const tok = tokenA.isNative ? tokenB : tokenA;
        const tokMin = tokenA.isNative ? amountBOut : amountAOut;
        const ethMin = tokenA.isNative ? amountAOut : amountBOut;
        h = await writeContractAsync({
          address: CONTRACTS.router, abi: ROUTER_ABI, functionName: "removeLiquidityETH",
          args: [tok.address, lpToRemove, (tokMin * slipBps) / 10000n, (ethMin * slipBps) / 10000n, address, deadline],
        });
      } else {
        h = await writeContractAsync({
          address: CONTRACTS.router, abi: ROUTER_ABI, functionName: "removeLiquidity",
          args: [tokenA.address, tokenB.address, lpToRemove, (amountAOut * slipBps) / 10000n, (amountBOut * slipBps) / 10000n, address, deadline],
        });
      }
      setTxKind("remove"); setHash(h); toast.info("Removing liquidity…");
    } catch (e: any) { toast.error(e?.shortMessage || "Failed"); }
  };

  const busy = isPending || confirming;

  return (
    <>
      <h1 className="text-2xl font-display font-semibold mb-6">Remove Liquidity</h1>

      <div className="rounded-2xl bg-secondary/40 p-4 space-y-3">
        <div className="text-xs text-muted-foreground">Pair</div>
        <div className="flex items-center gap-2">
          <TokenSelector value={tokenA} onChange={setTokenA} exclude={tokenB} />
          <Minus className="h-4 w-4 text-muted-foreground" />
          <TokenSelector value={tokenB} onChange={setTokenB} exclude={tokenA} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-secondary/40 p-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-muted-foreground">Amount to remove</span>
          <span className="text-3xl font-display">{percent}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full mt-3 accent-primary"
        />
        <div className="flex gap-2 mt-3">
          {[25, 50, 75, 100].map((p) => (
            <button key={p} onClick={() => setPercent(p)} className="flex-1 py-1.5 rounded-lg bg-secondary hover:bg-primary/10 text-xs">
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      {pairExists ? (
        <div className="mt-4 rounded-2xl bg-secondary/30 border border-border/40 p-4 space-y-2 text-sm tabular-nums">
          <Row label="Your LP balance" value={formatAmount(formatUnits(lpBal, 18))} />
          <Row label="LP to remove" value={formatAmount(formatUnits(lpToRemove, 18))} />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">LP allowance</span>
            {lpBal === 0n ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">N/A</span>
            ) : lpAllowance >= lpBal ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">✓ Approved (unlimited)</span>
            ) : lpToRemove > 0n && lpAllowance >= lpToRemove ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">✓ Approved</span>
            ) : lpAllowance > 0n ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Partial — re-approve needed</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">Not approved</span>
            )}
          </div>
          <Row label={`You will receive ${tokenA.symbol}`} value={formatAmount(formatUnits(amountAOut, tokenA.decimals))} />
          <Row label={`You will receive ${tokenB.symbol}`} value={formatAmount(formatUnits(amountBOut, tokenB.decimals))} />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground text-center">
          Pair does not exist yet.
        </div>
      )}

      <div className="mt-6 space-y-2">
        {!isConnected ? (
          <Button disabled className="w-full h-14">Connect wallet</Button>
        ) : !pairExists ? (
          <Button disabled className="w-full h-14">No pair</Button>
        ) : lpBal === 0n ? (
          <Button disabled className="w-full h-14">No liquidity to remove</Button>
        ) : lpToRemove === 0n ? (
          <Button disabled className="w-full h-14">Enter amount</Button>
        ) : needsApprove ? (
          <Button onClick={approveLP} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground">
            {busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Approve LP token"}
          </Button>
        ) : (
          <Button onClick={remove} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground font-semibold">
            {busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Remove Liquidity"}
          </Button>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground/90 tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>{value}</span>
    </div>
  );
}

function Panel({ label, token, setToken, amount, setAmount, balance, other }: any) {
  return (
    <div className="group rounded-2xl bg-secondary/30 hover:bg-secondary/40 border border-border/40 hover:border-primary/30 p-4 transition-all duration-200">
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
        <span className="uppercase tracking-wider text-[10px] font-medium">{label}</span>
        <button
          onClick={() => setAmount(trimDecimals(balance, 6))}
          className="hover:text-primary transition-colors tabular-nums flex items-center gap-1.5"
        >
          <span>Balance:</span>
          <span className="font-medium text-foreground/80">{formatAmount(balance)}</span>
          {Number(balance) > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">MAX</span>
          )}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          inputMode="decimal"
          className="border-0 bg-transparent text-3xl font-semibold tracking-tight tabular-nums p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
          style={{ fontFeatureSettings: '"tnum"', WebkitFontSmoothing: "antialiased" }}
        />
        <TokenSelector value={token} onChange={setToken} exclude={other} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground/70 tabular-nums">
        ≈ {amount && Number(amount) > 0 ? formatAmount(amount) : "0"} {token.symbol}
      </div>
    </div>
  );
}
