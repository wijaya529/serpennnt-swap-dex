import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { getChainConfig } from "@/lib/web3/contracts";
import { arcTestnet } from "@/lib/web3/chain";
import {
  Copy,
  ExternalLink,
  BookOpen,
  Sparkles,
  Rocket,
  FileCode2,
  Network,
  HelpCircle,
  ArrowLeftRight,
  Droplets,
  Plus,
  Minus,
  Wallet,
  Check,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Shadow LTC DEX" },
      { name: "description", content: "Official documentation for Shadow LTC DEX: features, getting started, smart contracts, network info, and FAQ." },
      { property: "og:title", content: "Documentation — Shadow LTC DEX" },
      { property: "og:description", content: "Learn how to swap, create pools, and provide liquidity on Shadow LTC." },
    ],
  }),
  component: DocsPage,
});

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "features", label: "Features", icon: Sparkles },
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "smart-contracts", label: "Smart Contracts", icon: FileCode2 },
  { id: "network", label: "Network Information", icon: Network },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Address copied");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
      aria-label="Copy address"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function ContractCard({ label, address, explorer, description }: { label: string; address: string; explorer: string; description: string }) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/40 p-5 hover:border-primary/40 hover:bg-card/60 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CopyButton value={address} />
          <a
            href={`${explorer}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
            aria-label="View on explorer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
      <div className="font-mono text-xs sm:text-sm text-foreground/80 break-all bg-background/40 rounded-lg px-3 py-2 border border-border/40">
        {address}
      </div>
    </div>
  );
}

function DocsPage() {
  const [active, setActive] = useState<string>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const cfg = getChainConfig(arcTestnet.id);
  const chain = arcTestnet;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleNav = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const features = [
    { icon: ArrowLeftRight, title: "Swap", desc: "Instantly exchange any supported token using deep on-chain liquidity with low slippage and a transparent 0.30% fee." },
    { icon: Plus, title: "Create Pool", desc: "Permissionlessly launch a new trading pair via the Factory contract — bootstrap markets for any ERC-20 token." },
    { icon: Droplets, title: "Add Liquidity", desc: "Provide token pairs to earn proportional swap fees. Receive LP tokens that represent your share of the pool." },
    { icon: Minus, title: "Remove Liquidity", desc: "Withdraw your share of underlying tokens plus accumulated fees at any time — no lockups, fully self-custodial." },
  ];

  const steps = [
    { icon: Wallet, title: "Connect Wallet", desc: "Click 'Connect Wallet' in the top right and approve the connection from MetaMask, OKX, or Rabby." },
    { icon: Sparkles, title: "Select Token", desc: "Open the Swap page and pick the tokens you want to trade. Paste any ERC-20 address to import custom tokens." },
    { icon: ArrowLeftRight, title: "Swap Assets", desc: "Enter an amount — estimated output, price impact, and minimum received are calculated in real time." },
    { icon: Check, title: "Confirm Transaction", desc: "Approve the token (one-time) if needed, then confirm in your wallet. Balances refresh automatically." },
  ];

  const faqs = [
    { q: "What is Shadow LTC?", a: "Shadow LTC is a non-custodial decentralized exchange built on an automated market maker (AMM) model. It enables permissionless token swaps and liquidity provisioning." },
    { q: "Is Shadow LTC custodial?", a: "No. You always retain custody of your assets — every action is signed by your own wallet and executed on-chain." },
    { q: "Which wallets are supported?", a: "MetaMask, OKX Wallet, Rabby Wallet, and any EIP-1193 compatible injected browser wallet." },
    { q: "What are the trading fees?", a: "Each swap charges a 0.30% fee that is distributed entirely to liquidity providers proportional to their pool share." },
    { q: "Why do I need to approve a token?", a: "ERC-20 requires authorizing the Router to spend your tokens. This is a one-time per-token approval mandated by the standard." },
    { q: "What is impermanent loss?", a: "When token prices diverge in a pool, the value of LP positions may underperform simply holding the tokens. Earned fees help offset this." },
    { q: "Can I list my own token?", a: "Yes. Paste any ERC-20 address in the token selector to import it. Then use Create Pair on the Liquidity page to launch a market." },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 py-14 relative">
          <div className="text-xs uppercase tracking-[0.35em] text-primary/80 mb-3">Documentation</div>
          <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight text-gradient">
            Shadow LTC Docs
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl text-base md:text-lg leading-relaxed">
            Everything you need to know about trading, providing liquidity, and building on Shadow LTC — the decentralized exchange powering the {chain.name} ecosystem.
          </p>
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden sticky top-20 z-40 glass border-b border-border/40">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-6 py-3 text-sm font-medium text-foreground"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span>Browse documentation</span>
          <span className="ml-auto text-xs text-muted-foreground capitalize">
            {sections.find((s) => s.id === active)?.label}
          </span>
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
          {/* Sidebar */}
          <aside
            className={`${mobileOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-28 lg:self-start`}
          >
            <nav className="rounded-xl border border-border/60 bg-card/40 p-2 glass">
              <div className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                On this page
              </div>
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleNav(s.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.72_0.16_165/0.3)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="space-y-20 min-w-0 scroll-smooth">
            {/* Overview */}
            <section id="overview" className="scroll-mt-32">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.25em] text-primary/80">Overview</span>
              </div>
              <h2 className="text-3xl font-display font-semibold mb-5">What is Shadow LTC?</h2>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-foreground font-medium">Shadow LTC</span> is a decentralized exchange (DEX) built on the
                  automated market maker (AMM) model. It empowers anyone to swap tokens, bootstrap new markets, and earn fees by
                  providing liquidity — entirely on-chain and without intermediaries.
                </p>
                <p>
                  Our mission is to bring frictionless, permissionless token trading to the {chain.name} ecosystem. Every interaction
                  is non-custodial: your keys, your tokens, your control.
                </p>
              </div>
            </section>

            {/* Features */}
            <section id="features" className="scroll-mt-32">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.25em] text-primary/80">Features</span>
              </div>
              <h2 className="text-3xl font-display font-semibold mb-5">Core Features</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="rounded-2xl border border-border/60 bg-card/40 p-6 hover:border-primary/40 transition-all group">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/15 text-primary mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-medium text-lg mb-1.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Getting Started */}
            <section id="getting-started" className="scroll-mt-32">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.25em] text-primary/80">Getting Started</span>
              </div>
              <h2 className="text-3xl font-display font-semibold mb-5">Your First Swap in 4 Steps</h2>
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li key={i} className="flex gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 hover:border-primary/40 transition-all">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Icon className="h-5 w-5" />
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground mb-1">{s.title}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Smart Contracts */}
            <section id="smart-contracts" className="scroll-mt-32">
              <div className="flex items-center gap-2 mb-3">
                <FileCode2 className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.25em] text-primary/80">Smart Contracts</span>
              </div>
              <h2 className="text-3xl font-display font-semibold mb-2">Deployed Contracts</h2>
              <p className="text-muted-foreground mb-5">
                All contracts are verified on the {chain.name} block explorer.
              </p>
              <div className="grid gap-3">
                <ContractCard label="Factory" description="Deploys and tracks all pair contracts" address={cfg.contracts.factory} explorer={cfg.explorer} />
                <ContractCard label="Router" description="Entry point for swaps and liquidity operations" address={cfg.contracts.router} explorer={cfg.explorer} />
                <ContractCard label={`Wrapped ${chain.nativeCurrency.symbol}`} description="ERC-20 wrapper around the native token" address={cfg.contracts.weth} explorer={cfg.explorer} />
                <ContractCard label="Multicall" description="Aggregates multiple read calls in a single RPC" address={cfg.contracts.multicall} explorer={cfg.explorer} />
              </div>
            </section>

            {/* Network */}
            <section id="network" className="scroll-mt-32">
              <div className="flex items-center gap-2 mb-3">
                <Network className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.25em] text-primary/80">Network</span>
              </div>
              <h2 className="text-3xl font-display font-semibold mb-5">Network Information</h2>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/40">
                  <img src={cfg.logo} alt={chain.name} className="h-14 w-14 rounded-full ring-2 ring-primary/20" />
                  <div>
                    <div className="text-xl font-medium">{chain.name}</div>
                    <div className="text-sm text-muted-foreground">The only network supported by Snake DEX</div>
                  </div>
                </div>
                <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Network Name</dt>
                    <dd className="font-medium">{chain.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Chain ID</dt>
                    <dd className="font-mono">{chain.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Native Currency</dt>
                    <dd className="font-medium">{chain.nativeCurrency.name} ({chain.nativeCurrency.symbol})</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Decimals</dt>
                    <dd className="font-mono">{chain.nativeCurrency.decimals}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">RPC Endpoint</dt>
                    <dd className="font-mono text-xs sm:text-sm break-all bg-background/40 rounded-lg px-3 py-2 border border-border/40 flex items-center justify-between gap-2">
                      <span>{chain.rpcUrls.default.http[0]}</span>
                      <CopyButton value={chain.rpcUrls.default.http[0]} />
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Block Explorer</dt>
                    <dd>
                      <a
                        href={cfg.explorer}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline font-mono text-sm"
                      >
                        {cfg.explorer} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-32">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-[0.25em] text-primary/80">FAQ</span>
              </div>
              <h2 className="text-3xl font-display font-semibold mb-5">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl border border-border/60 bg-card/40 p-5 open:bg-card/60 hover:border-primary/40 transition-all"
                  >
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-foreground">
                      <span>{f.q}</span>
                      <span className="text-primary text-2xl leading-none transition-transform group-open:rotate-45 shrink-0">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            <div className="pt-8 pb-4 text-center text-xs text-muted-foreground">
              Need more help? Reach out through the project's community channels.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
