import { useState } from "react";
import { TOKENS, type TokenInfo } from "@/lib/web3/contracts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const filtered = TOKENS.filter(
    (t) =>
      t.address !== exclude?.address &&
      (t.symbol.toLowerCase().includes(q.toLowerCase()) ||
        t.name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl bg-secondary hover:bg-secondary/80 px-3 py-2 transition-colors">
          {value ? (
            <>
              <img src={value.logo} alt={value.symbol} className="h-6 w-6 rounded-full" />
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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or symbol" className="pl-9" />
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.address + t.symbol}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <img src={t.logo} alt={t.symbol} className="h-8 w-8 rounded-full" />
              <div className="text-left">
                <div className="font-semibold">{t.symbol}</div>
                <div className="text-xs text-muted-foreground">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
