import { useEffect, useMemo, useState } from "react";
import { isAddress, getAddress } from "viem";
import { usePublicClient } from "wagmi";
import { TOKENS, ERC20_ABI, type TokenInfo } from "@/lib/web3/contracts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, ChevronDown, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CUSTOM_KEY = "snakedex.customTokens.v1";

function loadCustomTokens(): TokenInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TokenInfo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomTokens(list: TokenInfo[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const fallbackLogo =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%2310b981'/><stop offset='1' stop-color='%23064e3b'/></linearGradient></defs><circle cx='32' cy='32' r='30' fill='url(%23g)'/><text x='50%' y='55%' text-anchor='middle' font-family='Inter,system-ui' font-size='22' font-weight='700' fill='white'>?</text></svg>`,
  );

export function TokenSelector({
  value,
  onChange,
  exclude,
}: {
  value?: TokenInfo;
  onChange: (t: TokenInfo) => void;
  exclude?: TokenInfo;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState<TokenInfo[]>(() => loadCustomTokens());
  const [imported, setImported] = useState<TokenInfo | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);

  const publicClient = usePublicClient();

  useEffect(() => {
    if (!open) {
      setQ("");
      setImported(null);
      setImportError(null);
      setImportWarning(null);
      setImporting(false);
    }
  }, [open]);

  const allTokens = useMemo(() => [...TOKENS, ...custom], [custom]);

  const trimmed = q.trim();
  const isAddrQuery = isAddress(trimmed);

  const filtered = useMemo(() => {
    const ql = trimmed.toLowerCase();
    return allTokens.filter(
      (t) =>
        t.address !== exclude?.address &&
        (t.symbol.toLowerCase().includes(ql) ||
          t.name.toLowerCase().includes(ql) ||
          t.address.toLowerCase().includes(ql)),
    );
  }, [allTokens, exclude, trimmed]);

  // If a contract address is pasted and not already in our list, fetch from chain.
  useEffect(() => {
    if (!isAddrQuery || !publicClient) return;
    const addr = getAddress(trimmed);
    const existing = allTokens.find((t) => t.address.toLowerCase() === addr.toLowerCase());
    if (existing) {
      setImported(null);
      setImportError(null);
      return;
    }
    let cancelled = false;
    setImporting(true);
    setImportError(null);
    setImportWarning(null);
    setImported(null);

    (async () => {
      const safeRead = async <T,>(fn: "name" | "symbol" | "decimals"): Promise<T | null> => {
        try {
          return (await publicClient.readContract({
            address: addr,
            abi: ERC20_ABI,
            functionName: fn,
          })) as T;
        } catch {
          return null;
        }
      };

      try {
        // Probe code presence first to distinguish EOA from contract.
        const code = await publicClient.getBytecode({ address: addr }).catch(() => undefined);
        if (!code || code === "0x") {
          if (!cancelled) setImportError("No contract found at this address on Arc Testnet");
          return;
        }

        const [nameRaw, symbolRaw, decimalsRaw] = await Promise.all([
          safeRead<string>("name"),
          safeRead<string>("symbol"),
          safeRead<number>("decimals"),
        ]);

        const warnings: string[] = [];
        const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;

        let symbol = (symbolRaw ?? "").toString().trim();
        if (!symbol) {
          symbol = `TKN-${addr.slice(2, 6).toUpperCase()}`;
          warnings.push("symbol() reverted or empty");
        }
        let name = (nameRaw ?? "").toString().trim();
        if (!name) {
          name = `Unknown Token (${short})`;
          warnings.push("name() reverted or empty");
        }
        let decimals = decimalsRaw == null ? NaN : Number(decimalsRaw);
        if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) {
          decimals = 18;
          warnings.push("decimals() reverted — defaulting to 18");
        }

        if (cancelled) return;
        setImported({ address: addr, name, symbol, decimals, logo: fallbackLogo });
        if (warnings.length) setImportWarning(warnings.join(" • "));
      } catch {
        if (!cancelled) setImportError("Failed to read contract on Arc Testnet");
      } finally {
        if (!cancelled) setImporting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAddrQuery, trimmed, publicClient, allTokens]);

  const handleImport = (t: TokenInfo) => {
    const next = [...custom.filter((c) => c.address.toLowerCase() !== t.address.toLowerCase()), t];
    setCustom(next);
    saveCustomTokens(next);
    onChange(t);
  };

  const handleRemoveCustom = (e: React.MouseEvent, addr: string) => {
    e.stopPropagation();
    const next = custom.filter((c) => c.address.toLowerCase() !== addr.toLowerCase());
    setCustom(next);
    saveCustomTokens(next);
  };
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl bg-secondary hover:bg-secondary/80 px-3 py-2 transition-colors">
          {value ? (
            <>
              <img
                src={value.logo}
                alt={value.symbol}
                className="h-6 w-6 rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackLogo;
                }}
              />
              <span className="font-semibold">{value.symbol}</span>
            </>
          ) : (
            <span className="font-semibold text-primary">Select token</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-gradient">Select a token</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, symbol, or paste contract address"
            className="pl-9 tabular-nums"
            autoFocus
          />
        </div>

        {/* Import flow */}
        {isAddrQuery && (importing || importError || imported) && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {importing ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Fetching token from Arc Testnet…
              </div>
            ) : importError ? (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Import failed</div>
                  <div className="text-destructive/80 text-xs mt-0.5">{importError}</div>
                </div>
              </div>
            ) : imported ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={imported.logo} alt={imported.symbol} className="h-9 w-9 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {imported.symbol}
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                        Custom
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{imported.name}</div>
                    <div className="text-[10px] text-muted-foreground/70 font-mono truncate">
                      {imported.address}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Anyone can create a token with any name. Verify the contract address before
                    trading.
                  </span>
                </div>
                <Button
                  onClick={() => handleImport(imported)}
                  className="w-full bg-premium text-primary-foreground"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> Import {imported.symbol}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.length === 0 && !isAddrQuery && (
            <div className="text-center text-xs text-muted-foreground py-6">
              No tokens match. Paste a contract address to import.
            </div>
          )}
          {filtered.map((t) => {
            const isCustom = custom.some(
              (c) => c.address.toLowerCase() === t.address.toLowerCase(),
            );
            return (
              <button
                key={t.address + t.symbol}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 transition-all duration-150 hover:translate-x-0.5"
              >
                <img
                  src={t.logo}
                  alt={t.symbol}
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackLogo;
                  }}
                />
                <div className="text-left flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    {t.symbol}
                    {isCustom && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
