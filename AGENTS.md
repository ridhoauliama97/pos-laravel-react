# AGENTS.md — Point of Sale (POS)

Laravel 13 + React 19 SPA. Single SQLite DB, tenant_id scoping.

## Stack

- **Backend**: Laravel `^13.7`, PHP `^8.3`, Sanctum token auth
- **Frontend**: React `^19.2` SPA, Vite `^8`, TypeScript `~6.0`, Tailwind CSS `^4.3`
- **DB**: SQLite — session, cache, queue semua pakai `database` driver
- **State**: Zustand `^5` (global) + TanStack Query `^5` (server)
- **UI**: react-router-dom v7, react-hook-form + zod, react-hot-toast, recharts, lucide-react

## Developer Commands

```bash
# Backend (dari backend/)
php85 artisan serve                    # Dev server port 8000
php85 artisan test                     # PHPUnit (Unit + Feature)
php85 artisan migrate:fresh --seed     # Reset + seed
php85 artisan queue:listen             # Wajib jalan utk async jobs (loyalty points)

# Frontend (dari frontend/)
npm run dev                            # Vite dev server port 5173
npm run build                          # tsc -b && vite build (typecheck + build)
npm run lint                           # ESLint

# Full stack (dari backend/)
composer run dev                       # concurrently: serve + queue:listen + vite
composer run test                      # config:clear dulu, lalu artisan test
composer run setup                     # fresh project setup (install, env, key, migrate, build)
```

Tidak ada `npm run typecheck` — `npm run build` (tsc -b) adalah satu-satunya typecheck.

## Arsitektur Kunci

- **Tenancy**: Single SQLite, `tenant_id` di hampir semua tabel. TenantMiddleware baca dari header `X-Tenant-ID` (fallback ke `route('tenant_id')` atau `user->tenant_id`).
- **Branch isolation**: BranchMiddleware baca dari header `X-Branch-ID` (fallback ke `user->branch_id`). Super admin bisa ganti branch; role lain terikat ke branch sendiri.
- **Role middleware**: `role:super_admin,admin_cabang,kasir,gudang` — via alias di route.
- **Permission middleware**: `permission:dashboard.view,products.create,...` — via `permission` alias, membaca dari relasi role_permissions.
- **API envelope**: `{ success: bool, data: {}, message: string, errors: {} }`
- **Route convention**: Semua route API langsung `/api/...`, tanpa prefix `/v1/`.
- **Error handler**: `bootstrap/app.php:30-77` (bukan file `Exceptions/Handler.php`).
- **Checkout**: Atomic `DB::transaction` di `app/Services/POSService.php` — dispatch event `transaction.completed` → listener di `AppServiceProvider::boot()` dispatch `UpdateCustomerPoints` job ke queue `'low'`.

## Middleware Chain (route groups)

```
auth:sanctum → tenant → branch
```

Settings routes (profile, company, avatar, logo) hanya pakai `auth:sanctum + tenant` (tanpa branch).

## Data Headers

Setiap request dari frontend:
- `Authorization: Bearer <token>`
- `X-Tenant-ID: 1` (hardcoded, single tenant)
- `X-Branch-ID: <id>` (dari localStorage `selectedBranchId`)

## ENV Quirks (dari .env aktual)

| Key | Value | Notes |
|---|---|---|
| `APP_LOCALE` | `id` | Bahasa Indonesia default |
| `APP_FAKER_LOCALE` | `id_ID` | Faker data Indonesia |
| `SESSION_DRIVER` | `database` | Session di SQLite |
| `QUEUE_CONNECTION` | `database` | Queue jobs di SQLite |
| `CACHE_STORE` | `database` | Cache di SQLite |
| `DB_FOREIGN_KEYS` | `true` | Wajib untuk SQLite referential integrity |
| `SANCTUM_STATEFUL_DOMAINS` | `backend.test,localhost:5173,localhost:3000` | SPA stateful + CORS |

## Vite Proxy (`vite.config.ts`)

```
/api    → http://backend.test (changeOrigin)
/storage → http://backend.test (changeOrigin)
```

## FE TypeScript Conventions

- `verbatimModuleSyntax: true` — **wajib pakai `import type`** untuk type-only imports
- `erasableSyntaxOnly: true` — tidak bisa pakai `enum`, `namespace`; ganti dengan `const` union atau `as const`
- `noUnusedLocals` / `noUnusedParameters` — ketat, hapus atau prefix dengan `_`
- Path: semua relative (`../../../`), tidak ada `@/` alias
- Pre-existing error: banyak `Unexpected any` (`@typescript-eslint/no-explicit-any`) di seluruh pages — acceptable tech debt

## FE Theming

- Zustand `useThemeStore` — mode `light|dark|system`, 6 accent colors (`indigo|amber|gray|emerald|rose|violet`)
- Disimpan ke `data-accent` dan `data-theme` di `<html>`, class `.dark` on `<html>` untuk dark mode
- CSS custom properties untuk semua warna (`--bg`, `--bg-card`, `--text-primary`, `--accent`, dll.)
- File `index.css` berisi utility classes: `.btn`, `.card`, `.modal-*`, `.table-card`, `.badge-*`, `.stat-card`, `.skeleton`, `.pill`, `.form-*`, `.search-input`

## Frontend State Convention

Setiap komponen React harus handle 4 states: loading, empty, error, success.

**Auth**: Zustand `useAuthStore` — token di localStorage, login simpan ke `api.ts`.

**Cart**: Zustand `useCartStore` — items, customerId, notes. Subtotal dihitung di frontend (`price * qty - discount`).

**Theme**: Zustand `useThemeStore` — mode + accent, auto `prefers-color-scheme` listener.

## Seed Data

- **6 users**: admin@pos.test (super_admin), kasir@pos.test (kasir), gudang@pos.test (gudang), kasirbsd@pos.test (kasir), adminbsd@pos.test (admin_cabang), bogor@pos.test (admin_cabang) — semua password `password`
- **3 cabang**: Pusat (14 hari data), BSD (10 hari), Bogor (7 hari) — transaksi + PO + mutasi stok
- **7 kategori**, 5 unit, 4 payment methods, 6 customer (termasuk "Customer Umum" tanpa kontak)
- **4 supplier**, ~27 produk, ~3 promo aktif

## Tests

Hanya backend PHPUnit — 2 suite (Unit + Feature), in-memory SQLite (`:memory:`). Tidak ada frontend test (vitest tidak terinstal).

## Perintah Sebelum Push

```
npm run lint → npm run build → php85 artisan test
```

## Komponen UI

- `components/Modal.tsx` — Modal reusable dengan backdrop blur, size `sm|md|lg|xl`, footer slot. CSS di `index.css:407`.
- `components/Layout.tsx` — Sidebar + topbar layout dengan branch switcher, theming toggle.
- **react-hook-form + zod** untuk form validation di semua page.

## Catatan Tambahan

- `opencode.json` tidak ada — konfigurasi opencode absent di repo ini.
- `.devdbrc` — SQLite DB path untuk DevDB integration.
- `PRD.md` — Detail user stories, schema, roadmap (sebagian tidak terimplementasi — cek kode untuk source of truth).
