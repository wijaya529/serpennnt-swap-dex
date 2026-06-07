import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, isAddress, maxUint256 } from "viem";
import { ArrowLeft, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TokenSelector } from "@/components/TokenSelector";
import { ERC20_ABI, FAUCET_ABI, useChainConfig, type TokenInfo } from "@/lib/web3/contracts";
import { formatAmount } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/faucet/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Faucet Admin — Snake DEX" },
      { name: "description", content: "Admin panel for managing the Snake DEX faucet." },
    ],
  }),
});

function AdminPage() {
  const cfg = useChainConfig();
  const { address, isConnected } = useAccount();
  const faucet = cfg.contracts.faucet;

  const { data: owner } = useReadContract({
    address: faucet,
    abi: FAUCET_ABI,
    functionName: "owner",
  });
  const isOwner = !!owner && !!address && (owner as string).toLowerCase() === address.toLowerCase();

  if (!isConnected) {
    return (
      <Shell>
        <Notice icon={<ShieldAlert className="h-6 w-6 text-destructive" />} title="Wallet not connected">
          Connect your wallet to access the admin panel.
        </Notice>
      </Shell>
    );
  }
  if (!isOwner) {
    return (
      <Shell>
        <Notice icon={<ShieldAlert className="h-6 w-6 text-destructive" />} title="Access denied">
          Only the faucet owner can access this page.
          <div className="mt-2 text-xs text-muted-foreground break-all">Owner: {owner as string}</div>
        </Notice>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-2 text-xs text-primary">
        <ShieldCheck className="h-4 w-4" /> Connected as owner
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <FaucetAmountCard />
        <TokenManagementCard />
        <DepositCard />
        <WithdrawCard />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-gradient">Faucet Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tokens, claim amount, and balances.</p>
        </div>
        <Link to="/faucet" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to faucet
        </Link>
      </div>
      {children}
    </div>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function useTx(onDone?: () => void) {
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) {
      toast.success("Transaction confirmed");
      onDone?.();
      reset();
    }
  }, [isSuccess]); // eslint-disable-line
  return { writeContract, isBusy: isPending || isLoading, reset };
}

/* ---------------- Faucet Amount ---------------- */
function FaucetAmountCard() {
  const cfg = useChainConfig();
  const faucet = cfg.contracts.faucet;
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("18");

  const { data: current, refetch } = useReadContract({
    address: faucet,
    abi: FAUCET_ABI,
    functionName: "faucetAmount",
  });

  const { writeContract, isBusy } = useTx(() => refetch());

  const submit = () => {
    try {
      const parsed = parseUnits(amount || "0", Number(decimals));
      writeContract(
        { address: faucet, abi: FAUCET_ABI, functionName: "setFaucetAmount", args: [parsed] },
        { onError: (e) => toast.error(e.message.split("\n")[0]) }
      );
    } catch {
      toast.error("Invalid amount");
    }
  };

  return (
    <Card title="Faucet claim amount" desc="Amount sent per claim (raw units depend on token decimals).">
      <div className="text-xs text-muted-foreground">
        Current raw value: <span className="font-mono text-foreground">{current ? (current as bigint).toString() : "—"}</span>
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <div>
          <Label className="text-xs">Amount</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
        </div>
        <div>
          <Label className="text-xs">Decimals</Label>
          <Input value={decimals} onChange={(e) => setDecimals(e.target.value)} />
        </div>
      </div>
      <Button onClick={submit} disabled={isBusy || !amount} className="w-full">
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set claim amount"}
      </Button>
    </Card>
  );
}

/* ---------------- Token Allow / Disallow ---------------- */
function TokenManagementCard() {
  const cfg = useChainConfig();
  const faucet = cfg.contracts.faucet;
  const tokens = useMemo(() => cfg.tokens.filter((t) => !t.isNative), [cfg.tokens]);
  const [token, setToken] = useState<TokenInfo>(tokens[0]);

  const { data: allowed, refetch } = useReadContract({
    address: faucet,
    abi: FAUCET_ABI,
    functionName: "allowedTokens",
    args: token ? [token.address] : undefined,
    query: { enabled: !!token },
  });

  const { writeContract, isBusy } = useTx(() => refetch());

  const set = (enabled: boolean) =>
    writeContract(
      { address: faucet, abi: FAUCET_ABI, functionName: "setToken", args: [token.address, enabled] },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );

  return (
    <Card title="Enable / disable token" desc="Control which tokens users can claim.">
      <TokenSelector value={token} onChange={setToken} />
      <div className="text-xs">
        Status:{" "}
        {allowed ? (
          <span className="text-primary font-semibold">Enabled</span>
        ) : (
          <span className="text-destructive font-semibold">Disabled</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => set(true)} disabled={isBusy || !!allowed} variant="outline">
          Enable
        </Button>
        <Button onClick={() => set(false)} disabled={isBusy || !allowed} variant="outline">
          Disable
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Deposit ---------------- */
function DepositCard() {
  const cfg = useChainConfig();
  const faucet = cfg.contracts.faucet;
  const { address } = useAccount();
  const tokens = useMemo(() => cfg.tokens.filter((t) => !t.isNative), [cfg.tokens]);
  const [token, setToken] = useState<TokenInfo>(tokens[0]);
  const [amount, setAmount] = useState("");

  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, faucet] : undefined,
    query: { enabled: !!address && !!token },
  });

  const { data: bal, refetch: refetchBal } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [faucet],
    query: { enabled: !!token },
  });

  const parsed = (() => {
    try { return parseUnits(amount || "0", token.decimals); } catch { return 0n; }
  })();
  const needsApprove = parsed > 0n && ((allowance as bigint | undefined) ?? 0n) < parsed;

  const { writeContract, isBusy } = useTx(() => {
    refetchAllow();
    refetchBal();
    setAmount("");
  });

  const approve = () =>
    writeContract(
      { address: token.address, abi: ERC20_ABI, functionName: "approve", args: [faucet, maxUint256] },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );

  const deposit = () =>
    writeContract(
      { address: faucet, abi: FAUCET_ABI, functionName: "depositToken", args: [token.address, parsed] },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );

  return (
    <Card title="Deposit tokens" desc="Top up the faucet with tokens.">
      <TokenSelector value={token} onChange={setToken} />
      <div className="text-xs text-muted-foreground">
        Faucet balance: <span className="text-foreground font-semibold">{bal ? formatAmount(formatUnits(bal as bigint, token.decimals)) : "0"} {token.symbol}</span>
      </div>
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount in ${token.symbol}`} />
      {needsApprove ? (
        <Button onClick={approve} disabled={isBusy} className="w-full">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Approve ${token.symbol}`}
        </Button>
      ) : (
        <Button onClick={deposit} disabled={isBusy || parsed === 0n} className="w-full bg-premium text-primary-foreground">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deposit"}
        </Button>
      )}
    </Card>
  );
}

/* ---------------- Withdraw ---------------- */
function WithdrawCard() {
  const cfg = useChainConfig();
  const faucet = cfg.contracts.faucet;
  const tokens = useMemo(() => cfg.tokens.filter((t) => !t.isNative), [cfg.tokens]);
  const [token, setToken] = useState<TokenInfo>(tokens[0]);
  const [amount, setAmount] = useState("");

  const { data: bal, refetch } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [faucet],
    query: { enabled: !!token },
  });

  const { writeContract, isBusy } = useTx(() => { refetch(); setAmount(""); });

  const parsed = (() => {
    try { return parseUnits(amount || "0", token.decimals); } catch { return 0n; }
  })();

  const adminWithdraw = () =>
    writeContract(
      { address: faucet, abi: FAUCET_ABI, functionName: "adminWithdraw", args: [token.address, parsed] },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );

  return (
    <Card title="Admin withdraw" desc="Withdraw tokens from the faucet to the owner address.">
      <TokenSelector value={token} onChange={setToken} />
      <div className="text-xs text-muted-foreground">
        Faucet balance: <span className="text-foreground font-semibold">{bal ? formatAmount(formatUnits(bal as bigint, token.decimals)) : "0"} {token.symbol}</span>
      </div>
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount in ${token.symbol}`} />
      <Button onClick={adminWithdraw} disabled={isBusy || parsed === 0n} variant="destructive" className="w-full">
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
      </Button>
    </Card>
  );
}
