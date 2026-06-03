import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CHAIN_CONFIG, SUPPORTED_CHAIN_IDS, getChainConfig } from "@/lib/web3/contracts";
import { SUPPORTED_CHAINS } from "@/lib/web3/chain";
import { Copy, ExternalLink, BookOpen, ArrowLeftRight, Droplets, Network, FileCode2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Shadow LTC DEX" },
      { name: "description", content: "Learn how to swap tokens, provide liquidity, and use Shadow LTC across supported networks." },
      { property: "og:title", content: "Documentation — Shadow LTC DEX" },
      { property: "og:description", content: "Guides, supported networks, and smart contract addresses for Shadow LTC DEX." },
    ],
  }),
  component: DocsPage,
});

const sections = [
  { id: "introduction", label: "Introduction", icon: BookOpen },
  { id: "how-to-swap", label: "How to Swap", icon: ArrowLeftRight },
  { id: "liquidity-pools", label: "Liquidity Pools", icon: Droplets },
  { id: "supported-networks", label: "Supported Networks", icon: Network },
  { id: "smart-contracts", label: "Smart Contracts", icon: FileCode2 },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const;

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

function Addr({ label, address, explorer }: { label: string; address: string; explorer: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-sm text-foreground/90 truncate">{address}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => copy(address)} className="p-2 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy">
          <Copy className="h-4 w-4" />
        </button>
        <a href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer" className="p-2 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors" aria-label="View on explorer">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function DocsPage() {
  const [active, setActive] = useState<string>("introduction");
  const [selectedChain, setSelectedChain] = useState<number>(SUPPORTED_CHAIN_IDS[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const cfg = getChainConfig(selectedChain);
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === selectedChain);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-primary/80 mb-2">Documentation</div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-gradient">Shadow LTC Docs</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">Everything you need to swap, provide liquidity, and integrate with the Shadow LTC DEX across supported chains.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav className="rounded-xl border border-border/60 bg-card/40 p-2 glass">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{s.label}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="space-y-16 min-w-0">
            <section id="introduction" className="scroll-mt-28">
              <h2 className="text-2xl font-display font-semibold mb-4">Introduction</h2>
              <div className="rounded-xl border border-border/60 bg-card/40 p-6 space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-foreground font-medium">Shadow LTC</span> is a decentralized exchange (DEX) built on an AMM
                  (automated market maker) model. It lets anyone swap tokens, create new trading pairs, and earn fees by providing
                  liquidity — all without intermediaries.
                </p>
                <p>
                  The platform is non-custodial: you keep control of your assets at all times through your own wallet. Trades and
                  liquidity actions execute directly on-chain via audited Uniswap-style Factory and Router smart contracts.
                </p>
              </div>
            </section>

            <section id="how-to-swap" className="scroll-mt-28">
              <h2 className="text-2xl font-display font-semibold mb-4">How to Swap</h2>
              <ol className="space-y-3">
                {[
                  "Click 'Connect Wallet' in the top-right and approve the connection (MetaMask, OKX, Rabby, or any injected wallet).",
                  "Use the network selector to switch to a supported chain (Arc Testnet or IOPN Testnet).",
                  "Open the Swap page, choose the token you want to sell and the token you want to receive.",
                  "Enter an amount — the estimated output, price impact, and minimum received are calculated automatically.",
                  "If swapping an ERC-20, approve the Router once. Then click 'Swap' and confirm in your wallet.",
                  "Wait for the transaction to confirm; balances refresh automatically without a page reload.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">{i + 1}</span>
                    <span className="text-muted-foreground leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section id="liquidity-pools" className="scroll-mt-28">
              <h2 className="text-2xl font-display font-semibold mb-4">Liquidity Pools</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                  <h3 className="font-medium mb-2">Create a Pool</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    On the Liquidity page, pick two tokens. If no pair exists, click <span className="text-foreground">Create Pair</span> — the Factory
                    deploys a new pair contract and the UI updates automatically to let you seed initial liquidity.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                  <h3 className="font-medium mb-2">Add Liquidity</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter one amount; the paired amount auto-quotes from current reserves. Approve tokens if needed, then click
                    <span className="text-foreground"> Add Liquidity</span> to receive LP tokens representing your share.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                  <h3 className="font-medium mb-2">Remove Liquidity</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    From the Pools page, choose a position and the percentage to withdraw. Confirm the transaction — your share of the
                    underlying tokens plus accrued fees is returned to your wallet.
                  </p>
                </div>
              </div>
            </section>

            <section id="supported-networks" className="scroll-mt-28">
              <h2 className="text-2xl font-display font-semibold mb-4">Supported Networks</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {SUPPORTED_CHAINS.map((c) => {
                  const conf = CHAIN_CONFIG[c.id];
                  return (
                    <div key={c.id} className="rounded-xl border border-border/60 bg-card/40 p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <img src={conf.logo} alt={c.name} className="h-10 w-10 rounded-full" />
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">Chain ID: {c.id}</div>
                        </div>
                      </div>
                      <dl className="text-sm space-y-2">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Native</dt>
                          <dd className="font-mono">{c.nativeCurrency.symbol}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">RPC</dt>
                          <dd className="font-mono truncate max-w-[60%]" title={c.rpcUrls.default.http[0]}>{c.rpcUrls.default.http[0]}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Explorer</dt>
                          <dd>
                            <a className="text-primary hover:underline inline-flex items-center gap-1" href={conf.explorer} target="_blank" rel="noreferrer">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="smart-contracts" className="scroll-mt-28">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <h2 className="text-2xl font-display font-semibold">Smart Contracts</h2>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-1">
                  {SUPPORTED_CHAINS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChain(c.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        selectedChain === c.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Addr label="Factory" address={cfg.contracts.factory} explorer={cfg.explorer} />
                <Addr label="Router" address={cfg.contracts.router} explorer={cfg.explorer} />
                <Addr label={`Wrapped ${chainMeta?.nativeCurrency.symbol ?? "Native"}`} address={cfg.contracts.weth} explorer={cfg.explorer} />
                <Addr label="Multicall" address={cfg.contracts.multicall} explorer={cfg.explorer} />
              </div>
            </section>

            <section id="faq" className="scroll-mt-28">
              <h2 className="text-2xl font-display font-semibold mb-4">FAQ</h2>
              <div className="space-y-3">
                {[
                  {
                    q: "Is Shadow LTC custodial?",
                    a: "No. You connect your own wallet and sign every transaction. Shadow LTC never holds your funds.",
                  },
                  {
                    q: "Which wallets are supported?",
                    a: "MetaMask, OKX Wallet, Rabby Wallet, and any EIP-1193 injected browser wallet.",
                  },
                  {
                    q: "What are the trading fees?",
                    a: "Each swap charges a standard 0.30% fee that goes to liquidity providers proportionally to their pool share.",
                  },
                  {
                    q: "Why do I need to approve a token before swapping?",
                    a: "ERC-20 standard requires you to authorize the Router contract to move tokens on your behalf. This is a one-time per-token action.",
                  },
                  {
                    q: "What is impermanent loss?",
                    a: "When token prices in a pool diverge, the value of LP tokens can be lower than simply holding the tokens. Fees earned help offset this.",
                  },
                  {
                    q: "Can I add my own token?",
                    a: "Yes. On the token selector, paste any ERC-20 address. It will be imported and marked CUSTOM in your local list.",
                  },
                ].map((f, i) => (
                  <details key={i} className="group rounded-xl border border-border/60 bg-card/40 p-5 open:bg-card/60 transition-colors">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium">
                      <span>{f.q}</span>
                      <span className="text-primary text-xl leading-none transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
