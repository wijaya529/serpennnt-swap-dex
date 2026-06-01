import { createFileRoute } from "@tanstack/react-router";
import { useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ABI, PAIR_ABI, useChainConfig, type TokenInfo } from "@/lib/web3/contracts";
import { formatUnits, zeroAddress } from "viem";
import { ExternalLink, Layers } from "lucide-react";

export const Route = createFileRoute("/pools")({
  component: PoolsPage,
  head: () => ({
    meta: [
      { title: "Pools — Snake DEX" },
      { name: "description", content: "Browse all liquidity pools on Snake DEX." },
    ],
  }),
});

function PoolsPage() {
  const cfg = useChainConfig();
  const CONTRACTS = cfg.contracts;
  const tokens = cfg.tokens.filter((t: TokenInfo) => !t.isNative);
  const pairs: Array<[TokenInfo, TokenInfo]> = [];
  for (let i = 0; i < tokens.length; i++)
    for (let j = i + 1; j < tokens.length; j++) pairs.push([tokens[i], tokens[j]]);

  const { data: pairAddrs } = useReadContracts({
    contracts: pairs.map(([a, b]) => ({
      address: CONTRACTS.factory,
      abi: FACTORY_ABI,
      functionName: "getPair" as const,
      args: [a.address, b.address] as const,
    })),
  });

  const existing = pairs
    .map((p, i) => ({ pair: p, addr: pairAddrs?.[i]?.result as `0x${string}` | undefined }))
    .filter((p) => p.addr && p.addr !== zeroAddress);

  const { data: reservesData } = useReadContracts({
    contracts: existing.flatMap((e) => [
      { address: e.addr!, abi: PAIR_ABI, functionName: "getReserves" as const },
      { address: e.addr!, abi: PAIR_ABI, functionName: "token0" as const },
    ]),
    query: { enabled: existing.length > 0 },
  });

  const { data: factoryLength } = useReadContract({
    address: CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "allPairsLength",
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-display font-semibold">Liquidity Pools</h1>
          <p className="text-muted-foreground mt-2">All pools on Snake DEX · {cfg.name} · Total: {factoryLength?.toString() ?? "…"}</p>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
          <div className="col-span-5">Pool</div>
          <div className="col-span-3">Reserve A</div>
          <div className="col-span-3">Reserve B</div>
          <div className="col-span-1 text-right">Link</div>
        </div>
        {existing.length === 0 && (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Layers className="h-10 w-10 opacity-40" />
            No pools yet for the listed tokens on {cfg.name}. Be the first — head to Liquidity.
          </div>
        )}
        {existing.map((e, idx) => {
          const reserves = reservesData?.[idx * 2]?.result as readonly [bigint, bigint, number] | undefined;
          const token0 = reservesData?.[idx * 2 + 1]?.result as `0x${string}` | undefined;
          const [a, b] = e.pair;
          const aIs0 = token0?.toLowerCase() === a.address.toLowerCase();
          const rA = reserves ? (aIs0 ? reserves[0] : reserves[1]) : 0n;
          const rB = reserves ? (aIs0 ? reserves[1] : reserves[0]) : 0n;
          return (
            <div key={e.addr} className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-border/50 hover:bg-primary/5 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <img src={a.logo} alt={a.symbol} className="h-8 w-8 rounded-full ring-2 ring-card" />
                  <img src={b.logo} alt={b.symbol} className="h-8 w-8 rounded-full ring-2 ring-card" />
                </div>
                <div>
                  <div className="font-semibold">{a.symbol} / {b.symbol}</div>
                  <div className="text-xs text-muted-foreground font-mono">{e.addr?.slice(0, 8)}…{e.addr?.slice(-6)}</div>
                </div>
              </div>
              <div className="col-span-3 font-mono text-sm">{Number(formatUnits(rA, a.decimals)).toFixed(4)}</div>
              <div className="col-span-3 font-mono text-sm">{Number(formatUnits(rB, b.decimals)).toFixed(4)}</div>
              <div className="col-span-1 text-right">
                <a href={`${cfg.explorer}/address/${e.addr}`} target="_blank" rel="noreferrer" className="text-primary hover:text-accent">
                  <ExternalLink className="h-4 w-4 inline" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
