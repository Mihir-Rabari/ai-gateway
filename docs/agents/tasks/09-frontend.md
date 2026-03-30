# Agent 9 — Frontend (Web App)

**Owner:** Agent 9
**Scope:** `apps/web/`
**Must NOT touch:** Any backend service, `infra/`, shared backend packages

---

## Your Mission

Build a premium, dark-themed web app that makes developers and users say "wow." The current landing page has issues with Tailwind v4 syntax. Migrate everything to **shadcn/ui** components for a consistent, polished look — and build the remaining pages that the dashboard needs.

---

## Current State

- ✅ Next.js 15 with Tailwind CSS v4
- ✅ Space-themed dark landing page (BUT has syntax issues — needs rebuild)
- ✅ Login + Signup pages
- ✅ Dashboard layout (sidebar)
- ✅ Dashboard: Overview, Playground, Usage, Billing, Settings
- ❌ Landing page has `bg-white/05` syntax that breaks in Tailwind v4 → rebuild with shadcn
- ❌ No developer portal (`/dev/*`)
- ❌ No auth popup page (`/auth/popup`)
- ❌ No toast notifications
- ❌ No mobile responsive sidebar

---

## Critical: Install shadcn/ui First

shadcn/ui is a component library that copies components into your codebase.

```bash
# Run from apps/web directory
cd apps/web
pnpm dlx shadcn@latest init

# When prompted:
# - Style: Default (or New York)
# - Base color: Zinc (fits dark theme)
# - CSS variables: Yes
```

Then install the components you'll use:
```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add progress
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add toast
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add select
```

---

## Tasks

### Task 1 — Fix / Rebuild Landing Page

The current `apps/web/src/app/page.tsx` has issues with Tailwind v4 fractional opacity classes like `bg-white/05`. Rebuild using shadcn components.

**Design Requirements:**
- Dark monochrome — black background, white text
- Premium cinematic feel (think Linear, Vercel, Raycast)
- Hero section: large headline + CTA buttons (`Button` from shadcn)
- How it works: 3-step flow with icons (number badges)
- Pricing: 3 pricing cards (Free, Pro, Max) using shadcn `Card`
- Developer section: code snippet showing SDK usage
- Navigation: sticky top bar with Sign in + Get Started buttons

**Key sections:**
1. **Navbar** — Logo | How it works | Pricing | Developers | Sign in | Get Started
2. **Hero** — "One gateway. Infinite AI." + subtitle + CTA
3. **How it works** — 3 steps: Connect → Use → Scale
4. **Pricing** — Free / Pro / Max cards with feature lists
5. **Developer CTA** — code snippet + "Start building" button
6. **Footer** — minimal

### Task 2 — Dashboard Improvements

#### 2a. Real-time Credit Updates
Poll credit balance every 30 seconds in dashboard layout:
```typescript
useEffect(() => {
  if (!user) return;
  const interval = setInterval(() => {
    getCreditBalance(user.id).then((res) => {
      if (res && res.balance !== user.creditBalance) {
        // Update user in auth context
        refreshUser();
      }
    });
  }, 30_000);
  return () => clearInterval(interval);
}, [user]);
```

#### 2b. Toast Notifications
Use shadcn `Toaster` + `toast()` for:
- Login success → "Welcome back, {name}!"
- Credit low (< 10) → "⚠ Low credits — upgrade your plan"
- Request success in playground → "Response received ({tokens} tokens)"
- Copy API key → "API key copied"

Add `<Toaster />` to `dashboard/layout.tsx`.

#### 2c. Loading Skeletons
Replace empty states with shadcn `Skeleton` components:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

// In dashboard page while loading stats:
{loading ? (
  <div className="space-y-2">
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-4 w-24" />
  </div>
) : (
  <p className="text-3xl font-bold">{value}</p>
)}
```

#### 2d. Mobile Responsive Sidebar
Add hamburger menu for mobile:
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);

// Mobile: Dialog/Sheet with sidebar content
// Desktop: fixed sidebar (current behavior)
```

### Task 3 — Auth Popup Page (`/auth/popup`)

This is a **minimal standalone page** that opens as a popup window when a developer calls `AIGateway.signIn()` from their app.

Create `apps/web/src/app/auth/popup/page.tsx`:

**Requirements:**
- Completely standalone — no dashboard layout, no sidebar
- Minimal UI — just the login form on a dark background
- After successful login, use `window.opener.postMessage()` to send token back:
  ```typescript
  window.opener?.postMessage(
    { type: 'AI_GATEWAY_AUTH', accessToken: result.data.accessToken },
    '*' // or the specific origin if you know it
  );
  window.close();
  ```
- Handle case where `window.opener` is null (direct navigation)
- Show "Sign in to AI Gateway" as the title
- Include "Close window" button

```tsx
'use client';

import { useState } from 'react';
import { login } from '../../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPopupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await login(email, password);
    if (res.success && res.data) {
      // Send token to parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: 'AI_GATEWAY_AUTH', accessToken: res.data.accessToken, user: res.data.user },
          '*'
        );
        window.close();
      }
    } else {
      setError(res.error?.message ?? 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-2 h-2 rounded-full bg-white mx-auto mb-4 animate-pulse" />
          <h1 className="text-xl font-bold text-white">Sign in to AI Gateway</h1>
          <p className="text-sm text-white/40 mt-1">Authorize this app to use your credits</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Authorize'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => window.close()}>
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### Task 4 — Developer Portal (`/dev`)

Create the developer portal:

**Pages to build:**
```
/dev                    ← Dev overview (apps summary, total earnings)
/dev/apps               ← List of registered apps
/dev/apps/new          ← Register new app form
/dev/apps/[id]         ← App details + usage charts + API key management
/dev/earnings           ← Wallet balance + transaction history
/dev/docs               ← SDK documentation + quickstart
```

**`/dev/apps/new` form fields:**
- App name (required)
- Description (optional)
- Website URL (optional)
- Submit → calls POST /api/v1/apps
- On success → redirect to `/dev/apps/[id]`

**`/dev/apps/[id]` shows:**
- App name + description
- API key (masked, with reveal + copy button)
- Usage stats from analytics (calls GET /analytics/usage/app?appId=)
- "Rotate API key" button
- "Delete app" button (with confirmation dialog)

**`/dev/earnings` shows:**
- Total balance (₹XX.XX)
- Pending withdrawal (if any)
- "Withdraw" button (PayPal/bank — Phase 3)
- Transaction history table

### Task 5 — Migrate Pages to shadcn

Replace the hand-rolled glass components with proper shadcn equivalents:
- Stat cards → shadcn `Card` + `CardHeader` + `CardContent`
- Buttons → shadcn `Button` (variant: default, outline, ghost)
- Inputs → shadcn `Input`
- Badges (plan label) → shadcn `Badge`
- Plan comparison table → shadcn `Table` or custom cards

---

## Design System Reference

**Colors (Tailwind + shadcn CSS vars):**
```css
/* globals.css */
:root {
  --background: 0 0% 0%;          /* pure black */
  --foreground: 0 0% 100%;        /* pure white */
  --card: 0 0% 5%;                /* near-black cards */
  --border: 0 0% 12%;             /* subtle borders */
  --muted: 0 0% 40%;              /* muted text */
  --primary: 0 0% 100%;           /* white primary */
  --primary-foreground: 0 0% 0%;  /* black on primary */
}
```

**Typography:** Inter font (already configured)
**Border radius:** `0.75rem` (12px) for cards — set `--radius: 0.75rem`

---

## File Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx          ← Root layout (AuthProvider)
│   ├── page.tsx            ← Landing page (REBUILD)
│   ├── login/page.tsx      ← ✅ Done
│   ├── signup/page.tsx     ← ✅ Done
│   ├── auth/popup/page.tsx ← CREATE
│   └── dashboard/
│       ├── layout.tsx      ← Sidebar layout
│       ├── page.tsx        ← Overview
│       ├── playground/page.tsx
│       ├── usage/page.tsx
│       ├── billing/page.tsx
│       └── settings/page.tsx
├── context/
│   └── AuthContext.tsx     ← ✅ Done
├── lib/
│   └── api.ts              ← ✅ Done
└── components/
    └── ui/                 ← shadcn components (auto-generated)
```

---

## Env Vars Used

```env
NEXT_PUBLIC_AUTH_URL=http://localhost:3003
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3002
```
