import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Universal Model Layer",
    description: "Route OpenAI, Anthropic, and Google with one stable integration contract.",
    icon: Layers,
  },
  {
    title: "Latency Aware Routing",
    description: "Auto-select model and provider path based on performance and budget goals.",
    icon: Gauge,
  },
  {
    title: "Revenue Ready Billing",
    description: "Built-in credits and usage tracking for SaaS monetization from day one.",
    icon: CreditCard,
  },
  {
    title: "Enterprise Safety Rails",
    description: "Request policies, failover controls, and audit visibility without extra tooling.",
    icon: ShieldCheck,
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f7ff] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute right-[-10rem] top-20 h-[28rem] w-[28rem] rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-violet-300/20 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-slate-900/10 bg-white/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-xs font-bold text-white">AG</div>
            <p className="text-lg font-bold tracking-tight">AI Gateway</p>
          </div>
          <div className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <Link href="#capabilities" className="transition-colors hover:text-slate-950">
              Capabilities
            </Link>
            <Link href="#how" className="transition-colors hover:text-slate-950">
              How it works
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-slate-950">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 sm:block">
              Sign in
            </Link>
            <Link href="/signup">
              <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="container mx-auto px-4 pb-16 pt-14 md:px-6 md:pb-20 md:pt-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Badge className="mb-6 rounded-full border-slate-900/15 bg-white/80 px-4 py-1.5 text-slate-800">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Product-grade AI runtime
              </Badge>
              <h1 className="animate-slide-up text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                Ship AI features faster
                <span className="block bg-gradient-to-r from-cyan-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  without model lock-in.
                </span>
              </h1>
              <p className="animate-slide-up-delay mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
                One API, one wallet, one dashboard. Use frontier models across providers with built-in routing,
                credits, and reliability controls.
              </p>
              <div className="animate-slide-up-delay-2 mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup">
                  <Button size="lg" className="group rounded-full bg-slate-950 px-7 text-white hover:bg-slate-800">
                    Build with AI Gateway
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/dev/docs">
                  <Button size="lg" variant="outline" className="rounded-full border-slate-900/20 bg-white/80 px-7">
                    Read docs
                  </Button>
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-6 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  18.2M monthly requests
                </span>
                <span className="inline-flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-blue-600" />
                  &lt; 120ms failover
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="overflow-hidden border-slate-900/10 bg-white/85 shadow-2xl shadow-cyan-900/10 backdrop-blur">
                <CardHeader className="border-b border-slate-900/10 bg-gradient-to-r from-slate-950 to-slate-800 text-white">
                  <CardTitle className="text-xl">Live Routing Console</CardTitle>
                  <CardDescription className="text-slate-300">
                    Realtime traffic distribution by model and health.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="rounded-xl border border-slate-900/10 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current mix</p>
                      <Badge className="rounded-full bg-emerald-100 text-emerald-700">Healthy</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>claude-3-5-sonnet</span>
                        <span className="font-semibold">44%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>gpt-4.1</span>
                        <span className="font-semibold">31%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>gemini-2.0</span>
                        <span className="font-semibold">25%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-900/10 bg-white p-3">
                      <p className="text-slate-500">P95 latency</p>
                      <p className="mt-1 text-lg font-bold">842ms</p>
                    </div>
                    <div className="rounded-lg border border-slate-900/10 bg-white p-3">
                      <p className="text-slate-500">Success rate</p>
                      <p className="mt-1 text-lg font-bold">99.93%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="capabilities" className="container mx-auto px-4 py-8 md:px-6 md:py-10 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-slate-900/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
              <CardHeader>
                <Badge className="w-fit rounded-full bg-white/10 text-white">Control plane</Badge>
                <CardTitle className="mt-3 text-3xl font-black leading-tight md:text-4xl">
                  Built for modern AI products, not demos.
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Everything teams need to move from idea to production without rewriting infra every quarter.
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-5 sm:grid-cols-2">
              {pillars.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="border-slate-900/10 bg-white/90">
                    <CardHeader>
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                      <CardDescription className="text-slate-600">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how" className="container mx-auto px-4 py-16 md:px-6 md:py-20 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">How teams launch in one sprint</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              One setup flow, clear metrics, and billing that scales with customer usage.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="border-slate-900/10 bg-white/90">
              <CardHeader>
                <CardDescription className="font-mono tracking-widest">01 CONNECT</CardDescription>
                <CardTitle>Create app + API key</CardTitle>
                <CardDescription>Provision app credentials and start in minutes from the developer portal.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-900/10 bg-white/90">
              <CardHeader>
                <CardDescription className="font-mono tracking-widest">02 SHIP</CardDescription>
                <CardTitle>Call one endpoint</CardTitle>
                <CardDescription>Switch model providers dynamically without changing your product code path.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-900/10 bg-white/90">
              <CardHeader>
                <CardDescription className="font-mono tracking-widest">03 SCALE</CardDescription>
                <CardTitle>Track cost + reliability</CardTitle>
                <CardDescription>Use usage analytics and routing controls to protect margin and performance.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section id="pricing" className="container mx-auto px-4 pb-20 md:px-6 md:pb-24 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">Pricing with real production intent</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Straightforward plans with shared credits across providers.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col justify-between border-slate-900/10 bg-white/90 ${
                  plan.featured ? "relative ring-2 ring-slate-950" : ""
                }`}
              >
                {plan.featured ? <Badge className="absolute right-4 top-4 rounded-full bg-slate-950 text-white">Recommended</Badge> : null}
                <div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-slate-600">{plan.description}</CardDescription>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="pb-1 text-slate-500">{plan.note}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((feature) => (
                      <p key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {feature}
                      </p>
                    ))}
                  </CardContent>
                </div>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button className={`w-full rounded-full ${plan.featured ? "bg-slate-950 text-white hover:bg-slate-800" : ""}`} variant={plan.featured ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24 md:px-6 lg:px-8">
          <Card className="border-slate-900/10 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-2xl shadow-cyan-900/20">
            <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-10">
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-white/85">Launch now</p>
                <h3 className="mt-2 text-3xl font-black leading-tight md:text-4xl">Make your first production call today.</h3>
                <p className="mt-2 max-w-xl text-white/90">
                  Integrate in minutes, then scale traffic with confidence using one unified model gateway.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button size="lg" className="rounded-full bg-white text-slate-950 hover:bg-white/90">
                    Create account
                  </Button>
                </Link>
                <Link href="/dev">
                  <Button size="lg" variant="outline" className="rounded-full border-white/60 bg-transparent text-white hover:bg-white/10">
                    Open developer portal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-900/10 bg-white/70">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-9 text-sm text-slate-600 md:flex-row md:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AI Gateway</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="transition-colors hover:text-slate-950">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-slate-950">
              Privacy
            </Link>
            <Link href="/dev/docs" className="transition-colors hover:text-slate-950">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
