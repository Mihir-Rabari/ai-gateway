import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <span className="text-lg font-bold tracking-tight">AI Gateway</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#developers" className="hover:text-foreground transition-colors">Developers</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup">
              <Button className="rounded-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 md:pt-32 md:pb-40">
          <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
            <Badge variant="secondary" className="mb-6 rounded-full px-3 py-1 font-medium">
              v1.0 is now live
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl mb-6">
              One gateway. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/50">Infinite AI.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              The unified API for OpenAI, Anthropic, and Google. Buy credits once, use them across any model. Built for developers and users.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="rounded-full px-8 h-12 text-base">
                  Start for free
                </Button>
              </Link>
              <Link href="/dev/docs">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base">
                  Read docs
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 border-t">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Three simple steps to integrate world-class AI models into your workflow.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {[
                { step: "1", title: "Connect", desc: "Get your API key or sign in to your dashboard to get started immediately." },
                { step: "2", title: "Use", desc: "Call any supported model (GPT-4, Claude 3, Gemini) with a single unified API." },
                { step: "3", title: "Scale", desc: "Pay only for what you use. We handle rate limits, fallbacks, and billing." },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center group">
                  <div className="w-12 h-12 rounded-full border bg-muted/50 flex items-center justify-center text-xl font-bold mb-6 group-hover:bg-foreground group-hover:text-background transition-colors">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 border-t bg-muted/20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">No hidden fees. Subscribe to a plan that fits your needs.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl">Free</CardTitle>
                    <CardDescription>For exploring the API</CardDescription>
                    <div className="mt-4 flex items-baseline text-4xl font-bold">
                      ₹0
                      <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">✓ 100 Credits / month</li>
                      <li className="flex items-center gap-2">✓ Limited models</li>
                      <li className="flex items-center gap-2">✓ Standard rate limits</li>
                    </ul>
                  </CardContent>
                </div>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button variant="outline" className="w-full">Get Started</Button>
                  </Link>
                </CardFooter>
              </Card>

              <Card className="flex flex-col justify-between border-primary/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold tracking-wider uppercase transform rounded-bl-lg">
                  Popular
                </div>
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl">Pro</CardTitle>
                    <CardDescription>For professionals and indie hackers</CardDescription>
                    <div className="mt-4 flex items-baseline text-4xl font-bold">
                      ₹499
                      <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-foreground/80">
                      <li className="flex items-center gap-2">✓ 1,000 Credits / month</li>
                      <li className="flex items-center gap-2">✓ All models included</li>
                      <li className="flex items-center gap-2">✓ Increased rate limits</li>
                      <li className="flex items-center gap-2">✓ Email support</li>
                    </ul>
                  </CardContent>
                </div>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button className="w-full">Subscribe</Button>
                  </Link>
                </CardFooter>
              </Card>

              <Card className="flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl">Max</CardTitle>
                    <CardDescription>For teams and production apps</CardDescription>
                    <div className="mt-4 flex items-baseline text-4xl font-bold">
                      ₹1,499
                      <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">✓ 5,000 Credits / month</li>
                      <li className="flex items-center gap-2">✓ All models included</li>
                      <li className="flex items-center gap-2">✓ Priority routing</li>
                      <li className="flex items-center gap-2">✓ 24/7 Priority support</li>
                    </ul>
                  </CardContent>
                </div>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button variant="outline" className="w-full">Subscribe</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section id="developers" className="py-24 border-t">
          <div className="container mx-auto px-4 md:px-6 flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for developers</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Integrate AI Gateway into your app in minutes. Earn a 20% revenue split on all credits consumed through your integration.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Official JavaScript/TypeScript SDK",
                  "Unified API for OpenAI, Anthropic, Google",
                  "Built-in 'Sign in with AI Gateway' widget",
                  "Automated revenue sharing"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground/80">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">✓</div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/dev">
                <Button>
                  Go to Developer Portal
                </Button>
              </Link>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center px-4 py-3 border-b bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <div className="mx-auto text-xs text-muted-foreground font-mono">index.ts</div>
                </div>
                <div className="p-4 md:p-6 overflow-x-auto text-sm font-mono leading-relaxed">
                  <span className="text-purple-400">import</span> {"{"} AIGateway {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@ai-gateway/sdk-js&apos;</span>;<br/><br/>
                  <span className="text-muted-foreground">{"// 1. Sign in the user"}</span><br/>
                  <span className="text-purple-400">const</span> token = <span className="text-purple-400">await</span> AIGateway.<span className="text-blue-400">signIn</span>({"{"}<br/>
                  &nbsp;&nbsp;appId: <span className="text-green-400">&apos;app_12345&apos;</span><br/>
                  {"}"});<br/><br/>
                  <span className="text-muted-foreground">{"// 2. Initialize SDK"}</span><br/>
                  <span className="text-purple-400">const</span> ai = <span className="text-purple-400">new</span> <span className="text-yellow-200">AIGateway</span>({"{"} token {"}"});<br/><br/>
                  <span className="text-muted-foreground">{"// 3. Call any model"}</span><br/>
                  <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> ai.<span className="text-blue-400">chat</span>({"{"}<br/>
                  &nbsp;&nbsp;model: <span className="text-green-400">&apos;claude-3-5-sonnet&apos;</span>,<br/>
                  &nbsp;&nbsp;messages: [{"{"} role: <span className="text-green-400">&apos;user&apos;</span>, content: <span className="text-green-400">&apos;Hello!&apos;</span> {"}"}]<br/>
                  {"}"});<br/>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-muted text-foreground flex items-center justify-center font-bold text-[10px]">
              AI
            </div>
            <span className="text-sm font-semibold text-muted-foreground">AI Gateway</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AI Gateway. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
