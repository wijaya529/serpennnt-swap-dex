import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Web3Provider } from "@/components/Web3Provider";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { SnakeBackground } from "@/components/SnakeBackground";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-display text-gradient">404</h1>
        <p className="mt-4 text-muted-foreground">This path slithered away.</p>
        <Link to="/" className="mt-6 inline-block px-6 py-3 rounded-lg bg-premium text-primary-foreground font-semibold">
          Back to Snake
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Snake DEX — Premium Decentralized Exchange" },
      { name: "description", content: "Snake — a premium decentralized exchange on Arc Testnet. Swap, provide liquidity, and explore pools." },
      { property: "og:title", content: "Snake DEX" },
      { property: "og:description", content: "Premium decentralized exchange on Arc Testnet." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <Web3Provider>
      <SnakeBackground />
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>
      <Toaster />
    </Web3Provider>
  );
}
