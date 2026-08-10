import Link from "next/link";

export const metadata = { title: "Privacy Policy — AI Gateway" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 antialiased">
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded bg-zinc-100 text-xs font-mono font-bold text-zinc-950">AG</div>
            <p className="text-sm font-mono tracking-tight font-bold text-zinc-50">AI Gateway</p>
          </Link>
          <Link href="/" className="text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-100 transition-colors">← Back to home</Link>
        </div>
      </nav>
      <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-12 font-mono">Last updated: {new Date().getFullYear()}</p>
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">1. Data We Collect</h2>
            <p className="text-zinc-400 leading-relaxed">We collect: (a) account information (email, name), (b) API usage data (request counts, model selections, token counts, latency metrics), and (c) billing information (subscription plan, payment metadata).</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">2. How We Use Your Data</h2>
            <p className="text-zinc-400 leading-relaxed">Your data is used to: (a) provide and maintain the service, (b) track usage and enforce credit limits, (c) generate analytics dashboards, (d) process payments, and (e) send service notifications.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">3. Data Storage & Security</h2>
            <p className="text-zinc-400 leading-relaxed">Data is stored in encrypted PostgreSQL databases. API keys are encrypted at rest. We use JWT tokens with short expiry for authentication. Redis is used for session management and rate limiting with automatic TTL cleanup.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">4. Third-Party Providers</h2>
            <p className="text-zinc-400 leading-relaxed">API requests are proxied to third-party AI providers (OpenAI, Anthropic, Google). These providers have their own privacy policies. We do not store the content of your AI requests beyond what is needed for analytics aggregation.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">5. Your Rights</h2>
            <p className="text-zinc-400 leading-relaxed">You can: (a) request data export, (b) request account deletion, (c) opt out of analytics tracking. Contact support through the developer console to exercise these rights.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">6. Contact</h2>
            <p className="text-zinc-400 leading-relaxed">For privacy questions, contact support through the developer console.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
