import { Link } from "@tanstack/react-router";
import logo from "@/assets/snake-logo.png";
import { WalletButton } from "./WalletButton";
import { NetworkSelector } from "./NetworkSelector";

const navItems = [
  { to: "/swap", label: "Swap" },
  { to: "/liquidity", label: "Liquidity" },
  { to: "/pools", label: "Pools" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/docs", label: "Docs" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logo} alt="Snake DEX" className="h-12 w-12 drop-shadow-[0_0_15px_oklch(0.72_0.16_165/0.5)] transition-transform group-hover:scale-110" width={48} height={48} />
          <div className="leading-tight">
            <div className="text-xl font-display font-semibold tracking-wide text-gradient">SNAKE</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Decentralized Exchange</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-primary bg-primary/10" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="px-5 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <NetworkSelector />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
