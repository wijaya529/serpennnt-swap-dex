import { createFileRoute } from "@tanstack/react-router";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { ERC20_ABI, TOKENS } from "@/lib/web3/contracts";
import { formatUnits } from "viem";
import { Wallet } from "lucide-react";
import { arcTestnet } from "@/lib/web3/chain";

export const Route = createFileRoute("/portfolio")({
  component: Portfolio,
  head: () => ({
    meta: [
      { title: "Portfolio — Snake DEX" },
      { name: "description", content: "Track your token balances on Snake DEX." },
    ],
  }),
});

function Portfolio() {
  const { address, isConnected } = useAccount();
  const native = useBalance({ address, query: { enabled: !!address } });

  const erc20s = TOKENS.filter((t) => !t.isNative);
  const { data } = useReadContracts({
    contracts: erc20s.map((t) => ({
      address: t.address,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: address ? ([address] as const) : undefined,
    })),
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto glass rounded-3xl p-12 text-center shadow-elegant">
        <Wallet className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-display font-semibold">Connect your wallet</h1>
        <p className="text-muted-foreground mt-2">Connect to view your portfolio on Arc Testnet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-display font-semibold">Portfolio</h1>
        <p className="text-muted-foreground mt-2 font-mono text-sm">{address}</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
          <div className="col-span-6">Asset</div>
          <div className="col-span-6 text-right">Balance</div>
        </div>

        <Row symbol={arcTestnet.nativeCurrency.symbol} name="Native" logo={TOKENS[0].logo} balance={native.data ? formatUnits(native.data.value, native.data.decimals) : "0"} />

        {erc20s.map((t, i) => {
          const v = (data?.[i]?.result as bigint | undefined) ?? 0n;
          return <Row key={t.address} symbol={t.symbol} name={t.name} logo={t.logo} balance={formatUnits(v, t.decimals)} />;
        })}
      </div>
    </div>
  );
}

function Row({ symbol, name, logo, balance }: { symbol: string; name: string; logo: string; balance: string }) {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-border/50 hover:bg-primary/5 transition-colors">
      <div className="col-span-6 flex items-center gap-3">
        <img src={logo} alt={symbol} className="h-9 w-9 rounded-full" />
        <div>
          <div className="font-semibold">{symbol}</div>
          <div className="text-xs text-muted-foreground">{name}</div>
        </div>
      </div>
      <div className="col-span-6 text-right">
        <div className="font-mono text-lg">{Number(balance).toFixed(6)}</div>
      </div>
    </div>
  );
}
