import Link from "next/link";
import { ArrowRight, Zap, Shield, CreditCard, Layers, Terminal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const isBrowser = typeof window !== "undefined";
const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL ?? (isBrowser ? `${window.location.origin}/console` : "http://localhost:3009");

const providers = ["OpenAI", "Anthropic", "Google", "Codex", "Mistral"];

const features = [
  {
    icon: Layers,
    title: "Universal Model Layer",
    description: "Route OpenAI, Anthropic, Google, and Codex through one stable API. Switch providers without changing your code.",
    tag: "01 / LAYER",
  },
  {
    icon: Zap,
    title: "Latency-Aware Routing",
    description: "Auto-select the best model and provider path based on performance, cost, and budget goals. Failover in under 120ms.",
    tag: "02 / PERFORMANCE",
  },
  {
    icon: CreditCard,
    title: "Revenue-Ready Billing",
    description: "Built-in credits, usage tracking, and per-request metering. Monetize AI from day one — no external billing stack.",
    tag: "03 / BILLING",
  },
  {
    icon: Shield,
    title: "Enterprise Safety Rails",
    description: "Request policies, rate limits, audit logs, and failover controls. Production-grade governance without extra tooling.",
    tag: "04 / COMPLIANCE",
  },
];

const steps = [
  {
    num: "01",
    title: "Create an app",
    description: "Sign up, create a developer app, and get your API key in under a minute.",
  },
  {
    num: "02",
    title: "Call one endpoint",
    description: "Send requests to our unified API. Switch models with a single parameter — no code changes.",
  },
  {
    num: "03",
    title: "Track & scale",
    description: "Monitor usage, costs, and latency in real time. Scale across providers with confidence.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "₹0",
    note: "/month",
    description: "For prototypes and side projects.",
    features: ["100 monthly credits", "Core model access", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "₹499",
    note: "/month",
    description: "For serious products in production.",
    features: ["1,000 monthly credits", "All model families", "Higher throughput", "Email support"],
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    name: "Scale",
    price: "₹1,499",
    note: "/month",
    description: "For teams with serious traffic.",
    features: ["5,000 monthly credits", "Priority routing", "Team analytics", "Priority support"],
    cta: "Go Scale",
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
      {/* Ambient gradient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-zinc-700/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/2 -left-1/4 h-[400px] w-[400px] rounded-full bg-zinc-600/5 blur-[100px] animate-pulse-slow" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded bg-zinc-100 text-xs font-mono font-bold text-zinc-950">
              AG
            </div>
            <p className="text-sm font-mono tracking-tight font-bold text-zinc-50">AI Gateway</p>
          </div>
          <div className="hidden items-center gap-7 text-xs font-mono uppercase tracking-wider text-zinc-400 md:flex">
            <Link href="#features" className="transition-colors hover:text-zinc-100">
              Features
            </Link>
            <Link href="#how" className="transition-colors hover:text-zinc-100">
              How it works
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-zinc-100">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-xs font-mono uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-100 sm:block">
              Sign in
            </Link>
            <Button asChild size="sm" className="rounded-md bg-zinc-50 text-zinc-950 hover:bg-zinc-200 font-mono text-xs uppercase tracking-wider h-8 btn-glow">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left: Copy */}
            <div className="lg:col-span-7 flex flex-col items-start animate-slide-up">
              <div className="mb-6 font-mono text-xs tracking-widest text-zinc-500 uppercase animate-fade-in">
                One API · Every LLM · Zero lock-in
              </div>
              <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl lg:text-8xl">
                Ship AI features faster.
                <span className="block text-zinc-500">Zero model lock-in.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                One API, one wallet, one dashboard. Route LLM requests across OpenAI, Anthropic, Gemini, and Codex with performance-optimized failover, credit enforcement, and live auditing.
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

              {/* Provider strip */}
              <div className="mt-12">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Supported providers
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm text-zinc-500">
                  {providers.map((p) => (
                    <span key={p} className="transition-colors hover:text-zinc-300">{p}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Code snippet */}
            <div className="lg:col-span-5 animate-slide-up-delay">
              <div className="border border-zinc-800 bg-[#0c0c0e] rounded-lg overflow-hidden font-mono glass-card">
                {/* Terminal header */}
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-xs text-zinc-500">request.ts</span>
                </div>
                {/* Code body */}
                <div className="p-5 text-xs leading-relaxed">
                  <div className="text-zinc-500">{"//"} One endpoint — any model</div>
                  <div className="mt-2">
                    <span className="text-purple-400">const</span> <span className="text-zinc-300">res</span> <span className="text-zinc-500">=</span> <span className="text-blue-400">await</span> <span className="text-zinc-300">fetch</span><span className="text-zinc-500">(</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-emerald-400">&quot;https://api.your-gateway.com/v1/chat&quot;</span><span className="text-zinc-500">,</span>
                  </div>
                  <div className="pl-2 text-zinc-500">{"{"}</div>
                  <div className="pl-6">
                    <span className="text-zinc-300">method</span><span className="text-zinc-500">:</span> <span className="text-emerald-400">&quot;POST&quot;</span><span className="text-zinc-500">,</span>
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-300">headers</span><span className="text-zinc-500">: {"{"}</span>
                  </div>
                  <div className="pl-10">
                    <span className="text-emerald-400">&quot;Authorization&quot;</span><span className="text-zinc-500">:</span> <span className="text-emerald-400">&quot;Bearer ag-***&quot;</span><span className="text-zinc-500">,</span>
                  </div>
                  <div className="pl-6 text-zinc-500">{"}"},</div>
                  <div className="pl-6">
                    <span className="text-zinc-300">body</span><span className="text-zinc-500">: JSON.stringify({"{"}</span>
                  </div>
                  <div className="pl-10">
                    <span className="text-zinc-300">model</span><span className="text-zinc-500">:</span> <span className="text-emerald-400">&quot;gpt-4o&quot;</span><span className="text-zinc-500">,</span>
                  </div>
                  <div className="pl-10">
                    <span className="text-zinc-300">messages</span><span className="text-zinc-500">: [</span>
                  </div>
                  <div className="pl-14">
                    {"{"} <span className="text-zinc-300">role</span><span className="text-zinc-500">:</span> <span className="text-emerald-400">&quot;user&quot;</span><span className="text-zinc-500">,</span> <span className="text-zinc-300">content</span><span className="text-zinc-500">:</span> <span className="text-emerald-400">&quot;Hello!&quot;</span> {"}"}
                  </div>
                  <div className="pl-10 text-zinc-500">]</div>
                  <div className="pl-6 text-zinc-500">{"}),"}</div>
                  <div className="pl-2 text-zinc-500">{"});"}</div>

                  {/* Response */}
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <div className="text-zinc-500">{"//"} ↳ Auto-routed to cheapest provider</div>
                    <div className="mt-1">
                      <span className="text-zinc-300">model</span><span className="text-zinc-500">:</span> <span className="text-emerald-400">&quot;gpt-4o&quot;</span> <span className="text-zinc-600">{"//"} via OpenAI</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-zinc-300">tokens</span><span className="text-zinc-500">:</span> <span className="text-amber-400">42</span> <span className="text-zinc-600">{"//"} 1 credit deducted</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-zinc-300">latency</span><span className="text-zinc-500">:</span> <span className="text-amber-400">842</span><span className="text-zinc-500">ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-16 md:px-6 md:py-24 lg:px-8 border-t border-zinc-900">
          <div className="mb-12 max-w-3xl">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">01 / FEATURES</div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Built for modern AI runtimes.
            </h2>
            <p className="mt-4 text-zinc-400 text-base md:text-lg">
              Everything teams need to move from prototype to production without rewriting infrastructure every quarter.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded border border-zinc-800 bg-zinc-900">
                    <f.icon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">{f.tag}</div>
                    <h3 className="text-lg font-bold text-zinc-100">{f.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
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
            {steps.map((s) => (
              <div key={s.num} className="border border-zinc-800 bg-[#0c0c0e] rounded-lg p-6">
                <span className="font-mono text-2xl text-zinc-700 block mb-4">{s.num}</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="container mx-auto px-4 py-16 md:px-6 md:py-24 lg:px-8 border-t border-zinc-900">
          <div className="mb-12 text-center">
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3">03 / PRICING</div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Production-intent pricing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              Straightforward plans with shared credits across all providers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative border rounded-lg p-6 md:p-8 ${
                  plan.featured
                    ? "border-zinc-600 bg-[#0c0c0e] md:scale-[1.03]"
                    : "border-zinc-800 bg-[#0c0c0e]"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-zinc-100 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-950">
                    Recommended
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-zinc-100">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{plan.description}</p>
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.note}</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm text-zinc-400">
                      <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="sm"
                  className={`w-full rounded-md font-mono text-xs uppercase tracking-wider h-10 ${
                    plan.featured
                      ? "bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                      : "border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <Link href="/signup">{plan.cta}</Link>
                </Button>
              </div>
            ))}
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
