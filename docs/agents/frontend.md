# Frontend Guidelines

## Framework & Tooling
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: Zustand for client state, React Query (TanStack) for server state
- **Forms**: React Hook Form + Zod validation

## Folder Structure
```
src/
 ├── app/                    # Next.js App Router pages
 │   ├── (landing)/          # Public landing page
 │   ├── (dashboard)/        # Authenticated user dashboard
 │   ├── (dev)/              # Developer dashboard
 │   └── api/                # API routes (BFF layer)
 ├── components/
 │   ├── ui/                 # Base UI components (from @ai-gateway/ui)
 │   └── features/           # Feature-specific components
 ├── hooks/                  # Custom React hooks
 ├── stores/                 # Zustand stores
 ├── services/               # API call functions (axios/fetch wrappers)
 └── types/                  # Frontend-specific types
```

## Design Principles
- **Monochrome core** — use black, white, and greys as base
- **Space theme** — dark backgrounds, subtle glows, starfield textures
- **Minimal & cinematic** — generous whitespace, slow reveals, premium feel
- **Smooth animations** — use Framer Motion for page transitions and reveals
- **No clutter** — every element on screen must earn its place

## Component Rules
- Separate UI components from business logic
- UI components receive data via props — no API calls inside `components/ui/`
- Feature components can use hooks/services
- Never hardcode colors — use Tailwind config tokens

## API Calls
- All API calls go through `src/services/` — never call fetch directly in components
- Use React Query for all data fetching, caching, and mutation
- Always handle loading and error states

## Auth
- Store access token in memory (not localStorage)
- Store refresh token in httpOnly cookie
- Use Next.js middleware to protect dashboard routes

## Performance
- Use `next/image` for all images
- Use dynamic imports for heavy components
- Keep bundle size lean — avoid unnecessary dependencies
