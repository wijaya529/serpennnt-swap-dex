import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256, zeroAddress } from "viem";
import { Plus, Loader2 } from "lucide-react";
import { TokenSelector } from "@/components/TokenSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTRACTS, ERC20_ABI, FACTORY_ABI, NATIVE_TOKEN, PAIR_ABI, ROUTER_ABI, TOKENS, type TokenInfo } from "@/lib/web3/contracts";
import { useTokenBalance } from "@/lib/web3/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/liquidity")({
  component: LiquidityPage,
  head: () => ({
    meta: [
      { title: "Liquidity — Snake DEX" },
      { name: "description", content: "Add liquidity to earn fees on Snake DEX." },
    ],
  }),
});

const wrapAddr = (t: TokenInfo) => (t.isNative ? CONTRACTS.weth : t.address);

function LiquidityPage() {
  const { address, isConnected } = useAccount();
  const [tokenA, setTokenA] = useState<TokenInfo>(NATIVE_TOKEN);
  const [tokenB, setTokenB] = useState<TokenInfo>(TOKENS[2]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  const balA = useTokenBalance(tokenA);
  const balB = useTokenBalance(tokenB);

  const { data: pairAddr } = useReadContract({
    address: CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [wrapAddr(tokenA), wrapAddr(tokenB)],
  });

  const pairExists = pairAddr && pairAddr !== zeroAddress;

  const { data: reservesData } = useReadContracts({
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

  // Auto compute B from A based on reserves
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
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Confirmed");
      balA.refetch(); balB.refetch(); refA(); refB();
      setHash(undefined);
    }
  }, [isSuccess]);

  const approve = async (t: TokenInfo) => {
    try {
      const h = await writeContractAsync({ address: t.address, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.router, maxUint256] });
      setHash(h); toast.info(`Approving ${t.symbol}…`);
    } catch (e: any) { toast.error(e?.shortMessage || "Approval failed"); }
  };

  const addLiquidity = async () => {
    if (!address) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const slipBps = 9950n; // 0.5%
    try {
      let h: `0x${string}`;
      if (tokenA.isNative || tokenB.isNative) {
        const native = tokenA.isNative ? tokenA : tokenB;
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
      setHash(h); toast.info("Adding liquidity…");
    } catch (e: any) { toast.error(e?.shortMessage || "Failed"); }
  };

  const createPair = async () => {
    try {
      const h = await writeContractAsync({
        address: CONTRACTS.factory, abi: FACTORY_ABI, functionName: "createPair",
        args: [wrapAddr(tokenA), wrapAddr(tokenB)],
      });
      setHash(h); toast.info("Creating pair…");
    } catch (e: any) { toast.error(e?.shortMessage || "Failed"); }
  };

  const busy = isPending || confirming;
  const insuff = parsedA > balA.value || parsedB > balB.value;

  return (
    <div className="max-w-md mx-auto">
      <div className="glass rounded-3xl p-6 shadow-elegant">
        <h1 className="text-2xl font-display font-semibold mb-6">Add Liquidity</h1>

        <Panel label="Token A" token={tokenA} setToken={setTokenA} amount={amountA} setAmount={setAmountA} balance={balA.formatted} other={tokenB} />
        <div className="flex justify-center my-2"><div className="h-10 w-10 rounded-xl bg-secondary border-4 border-card flex items-center justify-center"><Plus className="h-4 w-4" /></div></div>
        <Panel label="Token B" token={tokenB} setToken={setTokenB} amount={amountB} setAmount={setAmountB} balance={balB.formatted} other={tokenA} />

        {pairExists && reserves && (
          <div className="mt-4 text-xs text-muted-foreground space-y-1 px-2">
            <div className="flex justify-between"><span>Pool reserves</span><span className="font-mono">{Number(formatUnits(reserves[0], 18)).toFixed(4)} / {Number(formatUnits(reserves[1], 18)).toFixed(4)}</span></div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {!isConnected ? (
            <Button disabled className="w-full h-14">Connect wallet</Button>
          ) : !pairExists ? (
            <Button onClick={createPair} disabled={busy} className="w-full h-14 bg-premium text-primary-foreground">
              {busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Create pair"}
            </Button>
          ) : !parsedA || !parsedB ? (
            <Button disabled className="w-full h-14">Enter amounts</Button>
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
      </div>
    </div>
  );
}

function Panel({ label, token, setToken, amount, setAmount, balance, other }: any) {
  return (
    <div className="rounded-2xl bg-secondary/40 p-4">
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>{label}</span>
        <button onClick={() => setAmount(balance)} className="hover:text-primary">Balance: {Number(balance).toFixed(4)}</button>
      </div>
      <div className="flex items-center gap-3">
        <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.0" className="border-0 bg-transparent text-2xl font-display p-0 h-auto focus-visible:ring-0" />
        <TokenSelector value={token} onChange={setToken} exclude={other} />
      </div>
    </div>
  );
}
