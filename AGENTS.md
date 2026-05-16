# AGENTS.md — Point of Sale (POS)

Laravel 13 + React 19 SPA. Single SQLite DB, `tenant_id` scoping.

## Stack

- **Backend**: Laravel `^13.7`, PHP `^8.3`, Sanctum token auth, Laravel Boost `^2.4` (dev)
- **Frontend**: React `^19.2` SPA, Vite `^8`, TypeScript `~6.0`, Tailwind CSS `^4.3`
- **DB**: SQLite — session, cache, queue semua pakai `database` driver
- **State**: Zustand `^5` (global) + TanStack Query `^5` (server)
- **UI**: react-router-dom v7, react-hook-form + zod, react-hot-toast, recharts, lucide-react
- **No frontend tests** (vitest tidak terinstal)

## Developer Commands

```bash
# Backend (from backend/)
php85 artisan serve                    # Dev server port 8000
php85 artisan test                     # PHPUnit (Unit + Feature), in-memory SQLite
php85 artisan migrate:fresh --seed     # Reset + seed
php85 artisan queue:listen             # Required for async loyalty points job

# Frontend (from frontend/)
npm run dev                            # Vite dev server port 5173
npm run build                          # tsc -b && vite build (typecheck + build)
npm run lint                           # ESLint

# Full stack (from backend/)
composer run dev                       # concurrently: serve + queue:listen + vite
composer run test                      # config:clear dulu, lalu artisan test
composer run setup                     # fresh project setup (install, env, key, migrate, build)
```

No separate `npm run typecheck` — `npm run build` (`tsc -b`) is the only typecheck.

## Middleware Chain

```
auth:sanctum → tenant → branch
```

Settings routes (profile, company, avatar, logo) use `auth:sanctum + tenant` only (no branch).

## Data Headers (every frontend request)

- `Authorization: Bearer <token>`
- `X-Tenant-ID: 1` (hardcoded, single tenant)
- `X-Branch-ID: <id>` (from localStorage `selectedBranchId`)

## Env Quirks

| Key | Value | Notes |
|---|---|---|
| `APP_LOCALE` | `id` | Indonesian default |
| `APP_FAKER_LOCALE` | `id_ID` | Faker data in Indonesian |
| `SESSION_DRIVER` | `database` | Session in SQLite |
| `QUEUE_CONNECTION` | `database` | Queue jobs in SQLite (`sync` in test) |
| `CACHE_STORE` | `database` | Cache in SQLite (`array` in test) |
| `DB_FOREIGN_KEYS` | `true` | Required for SQLite referential integrity |
| `SANCTUM_STATEFUL_DOMAINS` | `backend.test,localhost:5173,localhost:3000` | SPA stateful + CORS |

`.env` is not committed. Actual `.env` differs from `.env.example` (e.g., `DB_FOREIGN_KEYS`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`).

## Vite Proxy (frontend/ `vite.config.ts`)

```
/api    → http://backend.test (changeOrigin)
/storage → http://backend.test (changeOrigin)
```

## Frontend TypeScript Conventions

- `verbatimModuleSyntax: true` — must use `import type` for type-only imports
- `erasableSyntaxOnly: true` — no `enum`, `namespace`; use `const` union or `as const`
- `noUnusedLocals` / `noUnusedParameters` — strict; delete or prefix with `_`
- All paths relative (`../../../`), no `@/` alias
- ESLint has `@typescript-eslint/no-explicit-any: 'off'` globally — existing `any` usage is acceptable tech debt

## Frontend Architecture

### State (Zustand)

| Store | File | Purpose |
|---|---|---|
| `useAuthStore` | `stores/index.ts` | User, tenant, branch, login/logout/loadUser, selectedBranchId |
| `useCartStore` | `stores/index.ts` | Items, customerId, notes, subtotal calc (`price * qty - discount`) |
| `useThemeStore` | `stores/themeStore.ts` | `light|dark|system` mode, 6 accent colors, `data-accent`/`data-theme` on `<html>` |
| `useI18nStore` | `i18n/index.ts` | `id`/`en` language. `useT()` hook for dot-notation keys with `{param}` interpolation. |

### Component Convention

Every component handles 4 states: loading, empty, error, success.

### Key Components

- `components/Modal.tsx` — reusable, backdrop blur, sizes `sm|md|lg|xl`, footer slot
- `components/Layout.tsx` — sidebar + topbar layout, branch switcher, theme toggle
- UI forms use **react-hook-form + zod** everywhere

## Backend Architecture

- **API envelope**: `{ success: bool, data: {}, message: string, errors: {} }`
- **Route convention**: All routes at `/api/...` (no `/v1/` prefix, despite `V1` controller namespace)
- **Error handler**: `bootstrap/app.php:31-78` (not `Exceptions/Handler.php`)
- **Controllers**: `app/Http/Controllers/Api/V1/`
- **Key services**: `app/Services/POSService.php` (atomic checkout), `InventoryService.php`, `ReportService.php`
- **Checkout**: Atomic `DB::transaction` → dispatches `transaction.completed` event → `AppServiceProvider::boot()` dispatches `UpdateCustomerPoints` job to `'low'` queue
- **Permissions**: `PermissionMiddleware` reads from `Role` → `Permission` pivot. Middleware aliases: `role`, `permission`
- **Laravel Boost**: installed (`composer require laravel/boost --dev`) — provides AI agent tooling for Laravel

## Seed Data

- **6 users**: `admin@pos.test` (super_admin), `kasir@pos.test` (kasir), `gudang@pos.test` (gudang), `kasirbsd@pos.test` (kasir), `adminbsd@pos.test` (admin_cabang), `bogor@pos.test` (admin_cabang) — all password `password`
- **3 branches**: Pusat (14d data), BSD (10d), Bogor (7d) — transactions + PO + stock mutations
- **7 categories**, 5 units, 4 payment methods, 6 customers (incl. "Customer Umum" tanpa kontak)
- **4 suppliers**, ~27 products, ~3 active promotions

## Pre-push Checklist

```
npm run lint → npm run build → php85 artisan test
```

## Other Files

- `.devdbrc` — SQLite DB path for DevDB integration
- `PRD.md` — Partial user stories, schema, roadmap (check code for ground truth)
- `backend/README.md` — stock Laravel README (ignore for project-specific info)
