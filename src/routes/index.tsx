import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/snake-logo.png";
import { ArrowRightLeft, Droplets, Layers, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Snake DEX — Premium Decentralized Exchange on Arc" },
      { name: "description", content: "Trade, provide liquidity and explore pools on Snake DEX, a premium decentralized exchange on Arc Testnet." },
    ],
  }),
});

const features = [
  { to: "/swap", icon: ArrowRightLeft, title: "Swap", desc: "Trade tokens instantly with deep liquidity." },
  { to: "/liquidity", icon: Droplets, title: "Liquidity", desc: "Provide liquidity, earn protocol fees." },
  { to: "/pools", icon: Layers, title: "Pools", desc: "Discover every pair on Snake." },
  { to: "/portfolio", icon: Wallet, title: "Portfolio", desc: "Track balances and positions." },
] as const;

function Index() {
  return (
    <div className="space-y-24 py-10">
      <section className="text-center max-w-4xl mx-auto">
        <img src={logo} alt="Snake DEX premium serpent emblem" width={224} height={224} className="mx-auto h-56 w-56 drop-shadow-[0_0_60px_oklch(0.72_0.16_165/0.4)] animate-[float_6s_ease-in-out_infinite]" />
        <h1 className="mt-8 text-6xl md:text-7xl font-display font-semibold tracking-tight">
          The <span className="text-gradient">Serpent</span> of DeFi
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          A premium decentralized exchange on Arc Testnet — silent, swift and venom-precise. Swap, pool, and own your liquidity.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/swap" className="px-8 py-4 rounded-xl bg-premium text-primary-foreground font-semibold shadow-elegant hover:scale-[1.02] transition-transform">
            Launch Swap
          </Link>
          <Link to="/pools" className="px-8 py-4 rounded-xl border border-border hover:border-primary glass font-semibold transition-all">
            Explore Pools
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => (
          <Link key={f.to} to={f.to} className="group glass rounded-2xl p-6 hover:border-primary transition-all hover:shadow-elegant">
            <div className="h-12 w-12 rounded-xl bg-premium flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <f.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-display font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
          </Link>
        ))}
      </section>

      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  );
}
