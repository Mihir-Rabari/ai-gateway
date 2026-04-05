import Link from "next/link";
import { ArrowRight, Check, Globe, Layers, Shield, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const pillars = [
    {
      icon: <Layers className="h-5 w-5" />,
      title: "One API, every model",
      description: "Route OpenAI, Anthropic, and Google from a single unified integration surface.",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Reliable by design",
      description: "Fallbacks, retries, and provider failover built into every request path.",
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "Global performance",
      description: "Smart model routing keeps latency low while preserving output quality.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Create your project",
      description: "Generate an app, copy your key, and get production-safe defaults instantly.",
    },
    {
      step: "02",
      title: "Ship one integration",
      description: "Use one SDK and one endpoint, then choose models dynamically per request.",
    },
    {
      step: "03",
      title: "Track cost and usage",
      description: "See credits, latency, and success rates in one dashboard without extra tooling.",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "INR 0",
      cadence: "/month",
      description: "Perfect for experimenting and prototypes.",
      features: ["100 monthly credits", "Core models", "Community support"],
      cta: "Start free",
      variant: "outline" as const,
    },
    {
      name: "Pro",
      price: "INR 499",
      cadence: "/month",
      description: "Built for serious builders and indie products.",
      features: ["1,000 monthly credits", "All premium models", "Priority throughput", "Email support"],
      cta: "Go Pro",
      variant: "default" as const,
      featured: true,
    },
    {
      name: "Scale",
      price: "INR 1,499",
      cadence: "/month",
      description: "For teams running customer-facing AI workloads.",
      features: ["5,000 monthly credits", "Priority model routing", "Team analytics", "Priority support"],
      cta: "Scale up",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f7f5] text-foreground selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute left-[-10rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-gradient-to-br from-orange-200/80 to-amber-100/20 blur-3xl" />
        <div className="animate-float-delayed absolute right-[-8rem] top-[8rem] h-[24rem] w-[24rem] rounded-full bg-gradient-to-br from-sky-200/70 to-cyan-100/10 blur-3xl" />
        <div className="animate-pulse-slow absolute bottom-[-10rem] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/50 to-lime-100/10 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-50 w-full border-b border-black/10 bg-[#f7f7f5]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-black text-[11px] font-bold text-white">
              AG
            </div>
            <span className="text-base font-bold tracking-tight md:text-lg">AI Gateway</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-black/60 md:flex">
            <Link href="#features" className="transition-colors hover:text-black">
              Features
            </Link>
            <Link href="#workflow" className="transition-colors hover:text-black">
              Workflow
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-black">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm font-medium text-black/60 transition-colors hover:text-black sm:block">
              Sign in
            </Link>
            <Link href="/signup">
              <Button className="rounded-full bg-black text-white hover:bg-black/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1">
        <section className="container mx-auto px-4 pb-20 pt-20 md:px-6 md:pb-28 md:pt-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex justify-center">
              <Badge className="animate-fade-in rounded-full border-black/20 bg-white/70 px-4 py-1 text-black backdrop-blur-md">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                AI Gateway 2.0 Experience
              </Badge>
            </div>

            <h1 className="animate-slide-up text-balance text-center text-5xl font-black tracking-tight text-black md:text-7xl lg:text-8xl">
              Build once.
              <br />
              Route across every
              <span className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                {" "}
                frontier model.
              </span>
            </h1>

            <p className="animate-slide-up-delay mx-auto mt-6 max-w-2xl text-balance text-center text-lg leading-relaxed text-black/65 md:text-xl">
              The modern AI runtime for teams that care about speed, reliability, and margin.
              One SDK, one billing system, and one control plane.
            </p>

            <div className="animate-slide-up-delay-2 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="group h-12 rounded-full bg-black px-7 text-white hover:bg-black/90">
                  Start Building
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/dev/docs">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-black/20 bg-white/60 px-7 text-black backdrop-blur hover:bg-white">
                  Explore Docs
                </Button>
              </Link>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              <Card className="animate-slide-up border-black/10 bg-white/70 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardDescription className="text-black/55">Monthly throughput</CardDescription>
                  <CardTitle className="text-2xl">18.2M req</CardTitle>
                </CardHeader>
              </Card>
              <Card className="animate-slide-up-delay border-black/10 bg-white/70 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardDescription className="text-black/55">Model failover time</CardDescription>
                  <CardTitle className="text-2xl">&lt; 120ms</CardTitle>
                </CardHeader>
              </Card>
              <Card className="animate-slide-up-delay-2 border-black/10 bg-white/70 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardDescription className="text-black/55">Partner revenue share</CardDescription>
                  <CardTitle className="text-2xl">Up to 20%</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24 md:px-6 lg:px-8" id="features">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <Card key={pillar.title} className={`border-black/10 bg-white/75 backdrop-blur ${index === 1 ? "md:-translate-y-3" : ""}`}>
                <CardHeader>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                    {pillar.icon}
                  </div>
                  <CardTitle className="text-xl">{pillar.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-black/60">{pillar.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="workflow" className="border-y border-black/10 bg-white/50 py-24">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-black tracking-tight text-black md:text-5xl">From prototype to production in three steps</h2>
              <p className="mx-auto mt-4 max-w-2xl text-black/60">
                Launch quickly without sacrificing control. Everything you need to observe, optimize, and scale is built in.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((item) => (
                <Card key={item.step} className="group relative overflow-hidden border-black/10 bg-white/80 backdrop-blur">
                  <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-sky-500 to-emerald-500 transition-transform duration-500 group-hover:scale-x-100" />
                  <CardHeader>
                    <CardDescription className="font-mono text-xs tracking-widest text-black/40">{item.step}</CardDescription>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="text-black/60">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24 md:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-black p-6 text-white md:p-10">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-semibold md:text-2xl">Model fabric</h3>
              <Badge className="border-white/20 bg-white/10 text-white">Live routing</Badge>
            </div>
            <div className="relative">
              <div className="animate-marquee whitespace-nowrap text-sm font-medium text-white/70">
                GPT-4.1 • Claude 3.5 Sonnet • Gemini 2.0 • GPT-4o mini • Claude Haiku • Gemini Flash • GPT-4.1 • Claude 3.5 Sonnet • Gemini 2.0 • GPT-4o mini
              </div>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/55">Smart fallback</p>
                <p className="mt-2 text-lg font-semibold">Automatic provider switch on timeout</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/55">Cost guardrails</p>
                <p className="mt-2 text-lg font-semibold">Per-app budgets with real-time alerts</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/55">Usage insights</p>
                <p className="mt-2 text-lg font-semibold">Token, credits, latency in one timeline</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="container mx-auto px-4 pb-24 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black tracking-tight md:text-5xl">Simple plans that scale with you</h2>
            <p className="mx-auto mt-4 max-w-2xl text-black/60">No hidden usage traps. One wallet across all providers and models.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={`flex flex-col justify-between border-black/10 bg-white/80 backdrop-blur ${plan.featured ? "relative ring-2 ring-black/90" : ""}`}>
                {plan.featured ? (
                  <Badge className="absolute right-4 top-4 rounded-full bg-black text-white">Most popular</Badge>
                ) : null}
                <div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-black/60">{plan.description}</CardDescription>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="text-black/45">{plan.cadence}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((feature) => (
                      <p key={feature} className="flex items-center gap-2 text-sm text-black/70">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {feature}
                      </p>
                    ))}
                  </CardContent>
                </div>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button variant={plan.variant} className="w-full rounded-full">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24 md:px-6 lg:px-8">
          <Card className="overflow-hidden border-black/10 bg-gradient-to-br from-white to-zinc-100">
            <CardContent className="grid gap-8 p-6 md:grid-cols-2 md:p-10">
              <div>
                <Badge className="mb-4 rounded-full border-black/20 bg-white text-black">Developer first</Badge>
                <h3 className="text-3xl font-black tracking-tight md:text-4xl">Ship your first model call in under five minutes</h3>
                <p className="mt-4 text-black/65">
                  Use our TypeScript SDK, bring your app ID, and start monetizing usage with built-in billing rails.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/dev">
                    <Button className="rounded-full bg-black text-white hover:bg-black/90">
                      Open Dev Portal
                    </Button>
                  </Link>
                  <Link href="/dev/docs">
                    <Button variant="outline" className="rounded-full border-black/20 bg-white">
                      Read Integration Docs
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black p-4 text-xs text-white/80 md:text-sm">
                <p className="mb-3 font-mono text-white/50">$ curl https://api.ai-gateway.dev/v1/chat</p>
                <p className="font-mono text-sky-300">{`{`}</p>
                <p className="font-mono text-white/80">{`  "model": "claude-3-5-sonnet",`}</p>
                <p className="font-mono text-white/80">{`  "messages": [{ "role": "user", "content": "Generate launch copy" }],`}</p>
                <p className="font-mono text-white/80">{`  "appId": "app_live_29f1"`}</p>
                <p className="font-mono text-sky-300">{`}`}</p>
                <div className="mt-4 inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Ready in 118ms
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-white/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-black/55 md:flex-row md:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AI Gateway</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="transition-colors hover:text-black">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-black">
              Privacy
            </Link>
            <Link href="/dev/docs" className="transition-colors hover:text-black">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
