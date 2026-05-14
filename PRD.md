# Product Requirements Document — Point of Sale (POS)

> **Versi**: 1.0
> **Stack**: Laravel (Backend API) + React (Frontend SPA) + SQLite (Database)
> **Deployment**: Cloud/SaaS Multi-tenant
> **Target**: Retail menengah dengan cabang

---

## 1. Executive Summary

**Problem**: Retail bisnis dengan banyak cabang kesulitan mengelola penjualan, stok, dan laporan secara real-time karena data tersebar di tempat terpisah atau menggunakan sistem yang tidak terintegrasi.

**Solution**: POS berbasis cloud dengan arsitektur multi-tenant yang menangani transaksi, inventory multi-cabang, manajemen pelanggan & supplier, serta laporan konsolidasi — semuanya dalam satu dashboard responsif.

**Success Criteria**:
- Transaksi POS selesai dalam < 3 detik (input hingga cetak struk).
- Data stok antar cabang sinkron real-time (max latency 5 detik).
- Laporan konsolidasi semua cabang dapat diakses dalam 1 klik.
- Zero data loss pada transaksi (atomic write dengan rollback).
- Lighthouse Performance >= 85, Accessibility >= 90.

---

## 2. User Experience & Functionality

### 2.1 User Personas

| Persona | Kebutuhan |
|---|---|
| **Super Admin** (Pemilik) | Mengelola tenant, melihat laporan semua cabang, mengatur pricing & promo global |
| **Admin Cabang** (Manajer Toko) | Mengelola stok, pegawai, dan laporan cabang sendiri |
| **Kasir** | Input transaksi cepat, cetak struk, handle pembayaran & refund |
| **Gudang / Purchasing** | Manajemen supplier, PO, receiving stok |

### 2.2 User Stories

#### POS Transactions (Core)
| ID | Story | Acceptance Criteria |
|---|---|---|
| POS-01 | Sebagai kasir, saya ingin scan/search barang cepat untuk menambah item ke keranjang | Search by SKU, barcode, atau nama; hasil < 1 detik; support quantity multiplier |
| POS-02 | Sebagai kasir, saya ingin memproses pembayaran multi-metode | Tunai, debit/kredit, QRIS, split payment; hitung kembalian otomatis |
| POS-03 | Sebagai kasir, saya ingin mencetak struk setelah transaksi | Printable receipt / thermal printer / PDF; nomor invoice unik |
| POS-04 | Sebagai kasir, saya ingin melakukan refund/void transaksi | Refund full/sebagian; void hanya hari yang sama; alasan wajib diisi |
| POS-05 | Sebagai kasir, saya ingin hold/resume transaksi | Hold maks 10 transaksi; resume dalam shift yang sama |
| POS-06 | Sebagai admin, sistem harus mencatat semua transaksi dengan audit trail | Setiap transaksi tercatat: who, what, when; immutable log |

#### Inventory Management
| ID | Story | Acceptance Criteria |
|---|---|---|
| INV-01 | Sebagai admin cabang, saya ingin mengelola stok barang | CRUD barang dengan SKU, barcode, harga jual, harga beli, kategori, varian (size/warna) |
| INV-02 | Sebagai admin gudang, saya ingin mencatat stock adjustment | Adjustment in/out dengan reason; approval untuk write-off > threshold |
| INV-03 | Sebagai admin cabang, saya ingin transfer stok antar cabang | Request -> approve -> ship -> receive; track di kedua cabang |
| INV-04 | Sebagai admin, saya ingin mendapat notifikasi stok minimum | Configurable threshold per item; notifikasi real-time saat stok <= min |
| INV-05 | Sebagai admin, saya ingin melihat mutasi stok (stock card) | Timeline per barang: pembelian, penjualan, adjustment, transfer |

#### Multi-tenant & Multi-branch
| ID | Story | Acceptance Criteria |
|---|---|---|
| TEN-01 | Sebagai super admin, saya ingin mengelola tenant & cabang | Create/suspend tenant; setiap tenant bisa punya N cabang |
| TEN-02 | Sebagai admin cabang, saya hanya bisa lihat data cabang sendiri | Row-level data isolation per cabang |
| TEN-03 | Sebagai super admin, saya ingin laporan konsolidasi semua cabang | Grafik, export Excel/PDF, filter rentang tanggal & cabang |

#### Customer Management
| ID | Story | Acceptance Criteria |
|---|---|---|
| CUS-01 | Sebagai kasir, saya ingin registrasi customer cepat | Cukup nomor HP; data lain opsional; support member tier |
| CUS-02 | Sebagai admin, saya ingin melihat riwayat belanja customer | History per customer; total spending; preferred items |
| CUS-03 | Sebagai customer, saya ingin mengumpulkan poin/reward | Poin per transaksi (configurable rate); redeem poin di kasir |

#### Supplier & Purchase Order
| ID | Story | Acceptance Criteria |
|---|---|---|
| SUP-01 | Sebagai purchasing, saya ingin membuat PO ke supplier | PO number auto; status: draft -> sent -> partial -> received -> completed |
| SUP-02 | Sebagai purchasing, saya ingin receiving barang dari PO | Receiving sebagian/seluruh; auto-update stok |
| SUP-03 | Sebagai admin, saya ingin melihat hutang ke supplier | Aging report; due date tracking |

#### Discounts & Promotions
| ID | Story | Acceptance Criteria |
|---|---|---|
| PROMO-01 | Sebagai admin, saya ingin membuat diskon produk | Diskon persen/nominal; periode berlaku; global per cabang |
| PROMO-02 | Sebagai admin, saya ingin membuat promo bundling | Buy A get B; minimum belanja; promo multi-item |
| PROMO-03 | Sebagai kasir, diskon otomatis teraplikasi di kasir | Validasi syarat promo; diskon tampak di struk |

#### Reports & Dashboard
| ID | Story | Acceptance Criteria |
|---|---|---|
| RPT-01 | Sebagai admin, saya ingin dashboard real-time | Card: penjualan hari ini, jumlah transaksi, stok kritis, top products |
| RPT-02 | Sebagai admin, saya ingin laporan penjualan | Per hari/bulan/kustom; filter cabang; chart penjualan harian |
| RPT-03 | Sebagai admin, saya ingin laporan laba-rugi | COGS calculation; gross margin; net profit |
| RPT-04 | Sebagai admin, saya ingin export laporan | PDF dan Excel; semua laporan bisa di-export |

#### User & Role Management
| ID | Story | Acceptance Criteria |
|---|---|---|
| USR-01 | Sebagai super admin, saya ingin mengelola role & permission | Baca, tulis, hapus per modul; role: super_admin, admin_cabang, kasir, gudang |
| USR-02 | Sebagai admin, setiap user hanya punya akses sesuai role | Middleware/Policy enforce di setiap endpoint |

### 2.3 Non-Goals

- Tidak ada integrasi e-commerce / online store.
- Tidak ada manajemen produksi/manufacturing.
- Tidak ada sistem akuntansi double-entry penuh (hanya laba-rugi dasar).
- Tidak ada mobile app native (hanya web responsive untuk akses mobile).

---

## 3. Technical Specifications

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        React SPA                            │
│  (Vite + React Router + Tailwind + shadcn/ui + Recharts)   │
│  - /login, /pos, /dashboard, /inventory, /report           │
│  - Role-based routing & access control                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS / REST + JSON
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Laravel REST API                          │
│  - Sanctum (Auth + Token)                                   │
│  - Middleware: tenant, cabang, role, permission              │
│  - Form Request Validation                                  │
│  - Queue (notifikasi, export background)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    SQLite (per tenant)                       │
│  - 1 file database per tenant                               │
│  - Tenancy config: tenant_id di session                     │
│  - Backup otomatis ke cloud storage                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema (Major Tables)

#### Tenant Layer
- `tenants` — id, name, domain, status (active/suspended), created_at
- `branches` — id, tenant_id, name, address, phone, status
- `users` — id, branch_id, tenant_id, name, email, password, role, is_active
- `roles` — id, name
- `permissions` — id, name, guard
- `role_has_permissions` — role_id, permission_id

#### Master Data
- `categories` — id, name, slug
- `units` — id, name (pcs, kg, lusin)
- `products` — id, category_id, unit_id, tenant_id, name, sku, barcode, buy_price, sell_price, min_stock, is_active, image
- `product_variants` — id, product_id, name (M/L/XL), sku, buy_price, sell_price, stock
- `customers` — id, tenant_id, name, phone, email, point, member_tier
- `suppliers` — id, tenant_id, name, phone, email, address, opening_balance

#### Inventory
- `stock_mutations` — id, product_id, variant_id, branch_id, type (in/out), reference_type (sale/purchase/adjustment/transfer), reference_id, qty, stock_before, stock_after, note, user_id
- `stock_transfers` — id, product_id, variant_id, from_branch_id, to_branch_id, qty, status (requested/approved/shipped/received), requested_by, approved_by, received_by
- `stock_adjustments` — id, branch_id, type (in/out), reason, status, approved_by

#### Transactions
- `transactions` — id, branch_id, cashier_id, customer_id, invoice_no, subtotal, discount_total, tax_total, grand_total, payment_method, payment_amount, change_amount, status (completed/refunded/void), notes
- `transaction_items` — id, transaction_id, product_id, variant_id, qty, price, discount, subtotal
- `payment_methods` — id, name (cash/debit/credit/QRIS)
- `holds` — id, branch_id, cashier_id, items (JSON), created_at

#### Purchasing
- `purchase_orders` — id, supplier_id, branch_id, user_id, po_number, status, total, notes
- `purchase_order_items` — id, purchase_order_id, product_id, variant_id, qty, price, received_qty
- `purchase_receivings` — id, purchase_order_id, branch_id, user_id, received_date, notes

#### Promotions
- `promotions` — id, tenant_id, name, type (percent/fixed/bundle), value, min_purchase, start_date, end_date, is_active
- `promotion_items` — id, promotion_id, product_id, variant_id, discount_value

#### Loyalty
- `member_tiers` — id, name, min_spent, discount_percent, point_multiplier
- `point_redemptions` — id, customer_id, transaction_id, points_used, amount, created_at

### 3.3 API Design Pattern

```
GET    /api/v1/{tenant}/products?search=&category=&page=
POST   /api/v1/{tenant}/products
GET    /api/v1/{tenant}/products/{id}
PUT    /api/v1/{tenant}/products/{id}
DELETE /api/v1/{tenant}/products/{id}

POST   /api/v1/{tenant}/pos/cart/add      {product_id, variant_id, qty}
POST   /api/v1/{tenant}/pos/cart/remove   {cart_item_id}
POST   /api/v1/{tenant}/pos/checkout      {cart_id, customer_id, payment_method, amount}
GET    /api/v1/{tenant}/pos/holds
POST   /api/v1/{tenant}/pos/hold          {cart_id}
POST   /api/v1/{tenant}/pos/resume/{hold_id}

GET    /api/v1/{tenant}/dashboard/summary?branch=&date_from=&date_to=
GET    /api/v1/{tenant}/reports/sales?branch=&period=
GET    /api/v1/{tenant}/reports/profit-loss?from=&to=
```

- Response envelope: `{ success: bool, data: {}, message: string, errors: {} }`
- Pagination: `{ data: [], meta: { current_page, last_page, per_page, total } }`
- Error: `{ success: false, message: "Validation error", errors: { field: ["message"] } }`

### 3.4 Security & Privacy

| Area | Implementation |
|---|---|
| **Auth** | Laravel Sanctum token-based; login dengan email & password; session expire configurable |
| **Multi-tenant isolation** | Tenant scope via middleware — semua query otomatis filter `tenant_id` |
| **Row-level access** | Cabang scope: user dari cabang A tidak bisa lihat data cabang B |
| **Role-based access** | Middleware `role:super_admin|admin_cabang|kasir` di tiap route group |
| **Rate limiting** | API rate limit: 60 req/min untuk POS, 300 req/min untuk general |
| **Input validation** | Form Request validation di setiap endpoint |
| **CSRF** | Sanctum CSRF protection untuk stateful requests |
| **SQL injection** | Eloquent ORM (parameter binding) |
| **Data backup** | Backup SQLite harian otomatis ke cloud storage |

### 3.5 Frontend Architecture

| Area | Detail |
|---|---|
| **Framework** | React 19 + Vite |
| **Styling** | Tailwind CSS 4 + shadcn/ui components |
| **State** | Zustand untuk global state; React Query untuk server state |
| **Routing** | React Router v7 dengan role-based route protection |
| **Charts** | Recharts untuk dashboard & laporan |
| **Form** | React Hook Form + Zod validation |
| **Printing** | react-to-print untuk struk; integrasi thermal printer via Web USB/Serial (opsional) |
| **Responsive** | Mobile-first; sidebar collapse; POS page fullscreen mode |

#### Route Structure
```
/                         → Landing/Login
/dashboard                → Ringkasan penjualan, chart, top products
/pos                      → Halaman POS (keyboard-friendly)
/pos/history              → Riwayat transaksi
/pos/refund/:id           → Refund transaksi
/inventory/products       → Daftar produk
/inventory/products/create
/inventory/products/:id/edit
/inventory/stock-mutation → Mutasi stok
/inventory/stock-transfer → Transfer antar cabang
/inventory/adjustment     → Adjustment stok
/purchases/orders         → Purchase Order
/purchases/receive        → Receiving PO
/customers                → Daftar customer
/customers/:id            → Detail customer
/reports/sales            → Laporan penjualan
/reports/profit-loss      → Laba-rugi
/reports/stock            → Laporan stok
/settings/users           → Manajemen user
/settings/branches        → Manajemen cabang
/settings/promotions      → Promo & diskon
/settings/roles           → Role & permission
/settings/suppliers       → Supplier
```

### 3.6 Database: SQLite Considerations

**Mengapa SQLite untuk multi-tenant SaaS?**
- 1 database file per tenant → isolasi sempurna, backup per-tenant, restore individual.
- Cocok untuk skala UKM/retail menengah (ribuan transaksi/hari per tenant).
- Performa read-heavy sangat baik; write contention rendah untuk POS 1-10 kasir.

**Caveat & Mitigasi:**
- **Concurrent writes**: SQLite WAL mode + busy timeout; Laravel queue untuk writes async.
- **Backup**: Backup harian file SQLite ke S3/cloud (via Laravel task scheduler + Filesystem).
- **Scaling**: Jika tenant tumbuh besar, migrasi ke PostgreSQL per tenant dimungkinkan (abstraksi via Eloquent).
- **Migration**: Migrasi dijalankan untuk semua tenant database via command artisan.

---

## 4. Risks & Roadmap

### 4.1 Phased Rollout

#### Phase 1 — MVP (Core POS)
- Auth multi-tenant + multi-cabang
- Produk, kategori, varian
- POS transaction (cart → checkout → receipt)
- Pembayaran tunai, kartu, QRIS
- Cetak struk (PDF/print)
- Dashboard simple (penjualan hari ini)

#### Phase 2 — Inventory & Purchasing
- Manajemen stok (stock mutation, stock card)
- Transfer stok antar cabang
- Stock adjustment
- Purchase Order + Receiving
- Notifikasi stok minimum

#### Phase 3 — Customer & Promo
- Manajemen customer + member tier
- Poin loyalty
- Diskon & promo (percent, fixed, bundle)
- Riwayat belanja customer

#### Phase 4 — Advanced Reports
- Dashboard real-time dengan chart
- Laporan penjualan (filter cabang, periode, produk)
- Laporan laba-rugi
- Export PDF & Excel
- Laporan stok & mutasi

#### Phase 5 — Polish & Hardening
- Role & permission management
- Audit trail lengkap
- Error monitoring & logging
- Thermal printer integration
- Keyboard shortcuts di POS
- Dark mode

### 4.2 Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **SQLite concurrent write bottleneck** | Tinggi jika > 10 kasir bersamaan | WAL mode; queue async; batch writes; fallback ke PostgreSQL jika perlu |
| **Data loss on backup failure** | Kritis | Backup ke 2 lokasi (cloud + local); monitoring job failed |
| **Multi-tenant migration complexity** | Sedang | Command artisan `tenants:migrate` untuk semua tenant; migration versioning per tenant |
| **Thermal printer compatibility** | Rendah - Sedang | Web USB/Serial opsional; fallback print PDF; support ESC/POS |
| **Browser compatibility untuk POS** | Rendah | Target Chromium-based browser (Chrome/Edge) untuk POS; general page di semua browser |

### 4.3 Error Handling Strategy

| Layer | Approach |
|---|---|
| **API (Laravel)** | Global exception handler → JSON response; validation errors → field-level; 500 → logged + generic message |
| **Frontend (React)** | TanStack Query `onError` → toast notification; retry 3x untuk GET; no retry untuk mutation |
| **POS Transaction** | Atomic database transaction; rollback penuh jika gagal; user melihat error jelas ("Pembayaran gagal, coba lagi") |
| **Network Offline** | Deteksi `navigator.onLine`; queue transaksi di IndexedDB (Phase 5+); notifikasi saat online kembali |
| **Logging** | Laravel log (stack: daily + slack untuk critical); frontend console.error + sentry (opsional) |

---

## 5. Developer Workflow

### 5.1 Commands

```bash
# Clone & install
git clone <repo> && cd pos

# Backend
composer install
cp .env.example .env
php artisan key:generate
php artisan storage:link

# Multi-tenant migration
php artisan tenants:migrate          # Migrate semua tenant
php artisan tenants:seed             # Seed semua tenant
php artisan tenants:create --domain=store1.example.com  # Buat tenant baru

# Frontend
npm install
npm run dev          # Vite dev server

# Development servers
composer run dev     # Laravel serve + queue listen + vite (via Laravel CLI or concurrently)

# Testing
php artisan test                          # Semua test
php artisan test --filter=POSController   # Test spesifik
npm run test                              # Frontend vitest
npm run test -- --run                     # Single run without watch

# Lint & typecheck
composer run lint     # PHP CS Fixer / Pint
npm run lint          # ESLint
npm run typecheck     # TypeScript check
```

### 5.2 Command Order (Before Push)

```
npm run lint → npm run typecheck → php artisan test → npm run test
```

### 5.3 Directory Structure

```
pos/
├── backend/                     # Laravel app
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Middleware/       # tenant, branch, role middleware
│   │   │   └── Requests/        # Form Request validation
│   │   ├── Models/
│   │   ├── Services/            # Business logic layer
│   │   └── Actions/             # Single-responsibility actions (e.g. CheckoutAction)
│   ├── database/
│   │   ├── migrations/
│   │   ├── factories/
│   │   └── seeders/
│   ├── routes/
│   │   └── api.php
│   ├── tests/
│   │   ├── Feature/
│   │   └── Unit/
│   ├── composer.json
│   └── phpunit.xml
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/           # API client
│   │   ├── stores/             # Zustand stores
│   │   ├── types/              # TypeScript types
│   │   └── lib/                # Utilities
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── AGENTS.md
├── PRD.md
└── README.md
```

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **SKU** | Stock Keeping Unit — identifier unik untuk setiap produk |
| **COGS** | Cost of Goods Sold — harga pokok penjualan |
| **PO** | Purchase Order — pesanan pembelian ke supplier |
| **WAL mode** | Write-Ahead Logging — SQLite mode yang memungkinkan concurrent reads saat write |
| **Split payment** | Pembayaran dengan lebih dari satu metode (e.g. tunai 50rb + QRIS 30rb) |
| **Void** | Membatalkan transaksi yang sudah jadi (hari yang sama) |
| **Refund** | Mengembalikan barang dan mengembalikan uang |

---

## Appendix B: UI States Checklist (Every Component)

Setiap komponen React harus menangani 4 state berikut:

| State | Behavior |
|---|---|
| **Loading** | Skeleton loader atau spinner; tidak ada flash layout shift |
| **Empty** | Ilustrasi + pesan "Belum ada data" + CTA tombol jika relevan |
| **Error** | Toast/snackbar + opsi retry; pesan yang user-friendly (bukan stack trace) |
| **Success** | Transisi halus; toast konfirmasi; redirect jika perlu |
