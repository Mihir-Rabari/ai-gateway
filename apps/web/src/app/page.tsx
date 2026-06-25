import Link from "next/link";
import { ArrowRight, TrendingUp, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

const isBrowser = typeof window !== "undefined";
const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL ?? (isBrowser ? `${window.location.origin}/console` : "http://localhost:3009");

const pillars = [
  {
    title: "Universal Model Layer",
    description: "Route OpenAI, Anthropic, and Google with one stable integration contract.",
  },
  {
    title: "Latency Aware Routing",
    description: "Auto-select model and provider path based on performance and budget goals.",
  },
  {
    title: "Revenue Ready Billing",
    description: "Built-in credits and usage tracking for SaaS monetization from day one.",
  },
  {
    title: "Enterprise Safety Rails",
    description: "Request policies, failover controls, and audit visibility without extra tooling.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "INR 0",
    note: "/month",
    description: "For prototypes and hacks.",
    features: ["100 monthly credits", "Core model access", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "INR 499",
    note: "/month",
    description: "For serious products.",
    features: ["1,000 monthly credits", "All model families", "Higher throughput", "Email support"],
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    name: "Scale",
    price: "INR 1,499",
    note: "/month",
    description: "For teams in production.",
    features: ["5,000 monthly credits", "Priority routing", "Team analytics", "Priority support"],
    cta: "Go Scale",
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded bg-zinc-100 text-xs font-mono font-bold text-zinc-950">
              AG
            </div>
            <p className="text-sm font-mono tracking-tight font-bold text-zinc-50">AI Gateway</p>
          </div>
          <div className="hidden items-center gap-7 text-xs font-mono uppercase tracking-wider text-zinc-400 md:flex">
            <Link href="#capabilities" className="transition-colors hover:text-zinc-105">
              Capabilities
            </Link>
            <Link href="#how" className="transition-colors hover:text-zinc-105">
              How it works
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-zinc-105">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-xs font-mono uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-100 sm:block">
              Sign in
            </Link>
            <Button asChild size="sm" className="rounded-md bg-zinc-50 text-zinc-950 hover:bg-zinc-200 font-mono text-xs uppercase tracking-wider h-8">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="mb-6 font-mono text-xs tracking-widest text-zinc-500 uppercase">
                v1.0.4 // PRODUCT-GRADE AI ROUTING
              </div>
              <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl lg:text-8xl">
                Ship AI features faster.
                <span className="block text-zinc-500">Zero model lock-in.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                One API, one wallet, one dashboard. Route LLM requests across OpenAI, Anthropic, and Gemini with performance-optimized failover, credit enforcement, and live auditing.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 rounded-md bg-zinc-50 px-6 font-mono text-xs uppercase tracking-wider text-zinc-950 hover:bg-zinc-200">
                  <Link href="/signup">
                    Build with AI Gateway
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 rounded-md border-zinc-800 bg-transparent hover:bg-zinc-900 px-6 font-mono text-xs uppercase tracking-wider text-zinc-300">
                  <a href={`${CONSOLE_URL}/docs`} target="_blank" rel="noopener noreferrer">
                    Read docs
                  </a>
                </Button>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs text-zinc-500">
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                  REQUESTS: 18.2M/mo
                </span>
                <span className="inline-flex items-center gap-2">
                  <Workflow className="h-3.5 w-3.5 text-zinc-400" />
                  FAILOVER: &lt;120ms
                </span>
              </div>
            </div>

            {/* Live Routing Console */}
            <div className="lg:col-span-5">
              <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-6 font-mono">
                <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">LIVE ROUTING CONSOLE</h3>
                    <p className="text-xs text-zinc-500">Realtime traffic distribution</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-sm border border-emerald-900/30 bg-emerald-950/20 px-2 py-0.5 text-xs text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">claude-3-5-sonnet</span>
                      <span className="text-zinc-200">44%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-none overflow-hidden">
                      <div className="h-full bg-zinc-400" style={{ width: "44%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">gpt-4o</span>
                      <span className="text-zinc-200">31%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-none overflow-hidden">
                      <div className="h-full bg-zinc-500" style={{ width: "31%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">gemini-1.5-pro</span>
                      <span className="text-zinc-200">25%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-none overflow-hidden">
                      <div className="h-full bg-zinc-600" style={{ width: "25%" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-6">
                    <div>
                      <p className="text-[10px] text-zinc-500 tracking-wider">P95 LATENCY</p>
                      <p className="text-sm font-bold text-zinc-200">842ms</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 tracking-wider">SUCCESS RATE</p>
                      <p className="text-sm font-bold text-zinc-200">99.93%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="container mx-auto px-4 py-16 md:px-6 md:py-24 lg:px-8 border-t border-zinc-900">
          <div className="mb-12 max-w-3xl">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">01 / ARCHITECTURE</div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Built for modern AI runtimes.
            </h2>
            <p className="mt-4 text-zinc-400 text-base md:text-lg">
              Everything teams need to move from prototype to production without rewriting infrastructure every quarter.
            </p>
          </div>

          {/* Pillars Tabular Grid */}
          <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y divide-zinc-800 md:divide-y-0 md:divide-x border-b border-zinc-800">
              <div className="p-6 md:p-8 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="font-mono text-xs text-zinc-500 mb-2">01 // LAYER</div>
                  <h3 className="text-lg font-bold text-zinc-100 font-mono">Universal Model Layer</h3>
                </div>
                <p className="text-sm text-zinc-400 mt-4">
                  Route OpenAI, Anthropic, and Google with one stable integration contract.
                </p>
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="font-mono text-xs text-zinc-500 mb-2">02 // PERFORMANCE</div>
                  <h3 className="text-lg font-bold text-zinc-100 font-mono">Latency Aware Routing</h3>
                </div>
                <p className="text-sm text-zinc-400 mt-4">
                  Auto-select model and provider path based on performance and budget goals.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y divide-zinc-800 md:divide-y-0 md:divide-x">
              <div className="p-6 md:p-8 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="font-mono text-xs text-zinc-500 mb-2">03 // BILLING</div>
                  <h3 className="text-lg font-bold text-zinc-100 font-mono">Revenue Ready Billing</h3>
                </div>
                <p className="text-sm text-zinc-400 mt-4">
                  Built-in credits and usage tracking for SaaS monetization from day one.
                </p>
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="font-mono text-xs text-zinc-500 mb-2">04 // COMPLIANCE</div>
                  <h3 className="text-lg font-bold text-zinc-100 font-mono">Enterprise Safety Rails</h3>
                </div>
                <p className="text-sm text-zinc-400 mt-4">
                  Request policies, failover controls, and audit visibility without extra tooling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how" className="container mx-auto px-4 py-16 md:px-6 md:py-24 lg:px-8 border-t border-zinc-900">
          <div className="mb-12 text-center">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">02 / WORKFLOW</div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Launch in one sprint</h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              One setup flow, clear metrics, and billing that scales with customer usage.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-6 flex flex-col justify-between min-h-[180px]">
              <div>
                <span className="font-mono text-xs text-zinc-500 block mb-3">01 / CONNECT</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">Create app + API key</h3>
                <p className="text-sm text-zinc-400">
                  Provision app credentials and start in minutes from the developer portal.
                </p>
              </div>
            </div>
            <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-6 flex flex-col justify-between min-h-[180px]">
              <div>
                <span className="font-mono text-xs text-zinc-500 block mb-3">02 / SHIP</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">Call one endpoint</h3>
                <p className="text-sm text-zinc-400">
                  Switch model providers dynamically without changing your product code path.
                </p>
              </div>
            </div>
            <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-6 flex flex-col justify-between min-h-[180px]">
              <div>
                <span className="font-mono text-xs text-zinc-500 block mb-3">03 / SCALE</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">Track cost + reliability</h3>
                <p className="text-sm text-zinc-400">
                  Use usage analytics and routing controls to protect margin and performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="container mx-auto px-4 py-16 md:px-6 md:py-24 lg:px-8 border-t border-zinc-900">
          <div className="mb-12 text-center">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">03 / PRICING</div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Production intent pricing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              Straightforward plans with shared credits across providers.
            </p>
          </div>

          {/* Mobile Tabular List (visible on < md) */}
          <div className="space-y-6 md:hidden font-mono text-sm">
            {plans.map((plan) => (
              <div key={plan.name} className="border border-zinc-800 bg-[#0c0c0e] rounded-lg overflow-hidden">
                <div className="bg-zinc-900/50 border-b border-zinc-800 py-3 px-4 flex justify-between items-center">
                  <span className="font-bold text-zinc-100">{plan.name}</span>
                  <span className="font-bold text-zinc-100">{plan.price}</span>
                </div>
                <div className="divide-y divide-zinc-800/50 text-xs">
                  <div className="py-3 px-4 flex justify-between">
                    <span className="text-zinc-500">Credits Allowance</span>
                    <span className="text-zinc-300">{plan.features[0]}</span>
                  </div>
                  <div className="py-3 px-4 flex justify-between">
                    <span className="text-zinc-500">Model Range</span>
                    <span className="text-zinc-300">{plan.features[1]}</span>
                  </div>
                  <div className="py-3 px-4 flex justify-between">
                    <span className="text-zinc-500">Routing Path</span>
                    <span className="text-zinc-300">
                      {plan.name === "Starter" ? "Core models" : plan.name === "Pro" ? "High Throughput" : "Priority Routing"}
                    </span>
                  </div>
                  <div className="py-3 px-4 flex justify-between">
                    <span className="text-zinc-500">Support Tier</span>
                    <span className="text-zinc-300">
                      {plan.name === "Starter" ? "Community" : plan.name === "Pro" ? "Email support" : "Priority support"}
                    </span>
                  </div>
                </div>
                <div className="p-4 border-t border-zinc-800">
                  <Button asChild size="sm" className={`w-full rounded-md font-mono text-xs uppercase tracking-wider h-9 ${
                    plan.featured ? "bg-zinc-50 text-zinc-950 hover:bg-zinc-200" : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 border"
                  }`}>
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Tabular Grid (visible on >= md) */}
          <div className="hidden md:block w-full border border-zinc-800 bg-[#0c0c0e] rounded-lg overflow-hidden font-mono text-xs">
            {/* Table Header */}
            <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-900/40 py-4 px-6 text-zinc-500 uppercase tracking-widest font-semibold font-mono">
              <div>Plan / Capability</div>
              <div>Starter</div>
              <div>Pro [Recommended]</div>
              <div>Scale</div>
            </div>

            {/* Row: Price */}
            <div className="grid grid-cols-4 border-b border-zinc-800/60 py-4 px-6 items-center">
              <div className="text-zinc-400 uppercase tracking-wider font-semibold">Monthly Cost</div>
              <div className="text-sm font-bold text-zinc-100">INR 0</div>
              <div className="text-sm font-bold text-zinc-100">INR 499</div>
              <div className="text-sm font-bold text-zinc-100">INR 1,499</div>
            </div>

            {/* Row: Credits */}
            <div className="grid grid-cols-4 border-b border-zinc-800/60 py-4 px-6 items-center">
              <div className="text-zinc-400 uppercase tracking-wider font-semibold">Credits</div>
              <div className="text-zinc-300">100 monthly</div>
              <div className="text-zinc-300">1,000 monthly</div>
              <div className="text-zinc-300">5,000 monthly</div>
            </div>

            {/* Row: Model Access */}
            <div className="grid grid-cols-4 border-b border-zinc-800/60 py-4 px-6 items-center">
              <div className="text-zinc-400 uppercase tracking-wider font-semibold">Model Access</div>
              <div className="text-zinc-300">Core Models</div>
              <div className="text-zinc-300">All Model Families</div>
              <div className="text-zinc-300">All Model Families</div>
            </div>

            {/* Row: Throughput / Failover */}
            <div className="grid grid-cols-4 border-b border-zinc-800/60 py-4 px-6 items-center">
              <div className="text-zinc-400 uppercase tracking-wider font-semibold">Failover/Throughput</div>
              <div className="text-zinc-500">Standard</div>
              <div className="text-zinc-300">High Throughput</div>
              <div className="text-zinc-100 font-bold">Priority Routing</div>
            </div>

            {/* Row: Support */}
            <div className="grid grid-cols-4 border-b border-zinc-800/60 py-4 px-6 items-center">
              <div className="text-zinc-400 uppercase tracking-wider font-semibold">Support</div>
              <div className="text-zinc-300">Community support</div>
              <div className="text-zinc-300">Email support</div>
              <div className="text-zinc-100 font-bold">Priority support</div>
            </div>

            {/* Row: Actions */}
            <div className="grid grid-cols-4 py-5 px-6 items-center">
              <div className="text-zinc-400 uppercase tracking-wider font-semibold">Provision</div>
              <div>
                <Button asChild size="sm" variant="outline" className="border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 rounded-md font-mono text-xs">
                  <Link href="/signup">Start Free</Link>
                </Button>
              </div>
              <div>
                <Button asChild size="sm" className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200 rounded-md font-mono text-xs">
                  <Link href="/signup">Upgrade to Pro</Link>
                </Button>
              </div>
              <div>
                <Button asChild size="sm" variant="outline" className="border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 rounded-md font-mono text-xs">
                  <Link href="/signup">Go Scale</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 pb-24 md:px-6 lg:px-8">
          <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-2">GET STARTED</div>
              <h3 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Make your first production call today.
              </h3>
              <p className="mt-2 max-w-xl text-zinc-400 text-sm">
                Integrate in minutes, then scale traffic with confidence using one unified model gateway.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-md bg-zinc-50 text-zinc-950 hover:bg-zinc-200 font-mono text-xs uppercase tracking-wider h-11 px-6">
                <Link href="/signup">Create account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-md border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 font-mono text-xs uppercase tracking-wider h-11 px-6">
                <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                  Open console
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#09090b]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-xs font-mono text-zinc-500 md:flex-row md:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AI Gateway</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="transition-colors hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-zinc-300">
              Privacy
            </Link>
            <a
              href={`${CONSOLE_URL}/docs`}
              className="transition-colors hover:text-zinc-300 focus-visible:outline-none"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
