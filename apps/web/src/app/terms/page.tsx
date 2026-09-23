import Link from "next/link";

export const metadata = { title: "Terms of Service — AI Gateway" };

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-12 font-mono">Last updated: {new Date().getFullYear()}</p>
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">1. Acceptance of Terms</h2>
            <p className="text-zinc-400 leading-relaxed">By accessing or using AI Gateway, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">2. Description of Service</h2>
            <p className="text-zinc-400 leading-relaxed">AI Gateway provides a unified API for routing requests across multiple AI model providers, along with usage analytics, credit management, and billing infrastructure.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">3. Acceptable Use</h2>
            <p className="text-zinc-400 leading-relaxed">You agree not to: (a) use the service for unlawful activities, (b) attempt to circumvent rate limits or credit enforcement, (c) redistribute or resell access without authorization, or (d) interfere with service operations.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">4. Credits and Billing</h2>
            <p className="text-zinc-400 leading-relaxed">Credits are consumed per API request based on model and token usage. Subscription plans renew monthly. Unused credits do not roll over. Refunds are handled on a case-by-case basis.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">5. Limitation of Liability</h2>
            <p className="text-zinc-400 leading-relaxed">AI Gateway is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from service use.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">6. Contact</h2>
            <p className="text-zinc-400 leading-relaxed">For questions about these terms, contact support through the developer console.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
