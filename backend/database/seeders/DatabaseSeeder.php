<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMutation;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ─── TENANT & BRANCHES ───
        $tenant = Tenant::create([
            'name' => 'Default Tenant',
            'domain' => 'default',
            'status' => 'active',
        ]);

        $branchPusat = Branch::create([
            'tenant_id' => $tenant->id,
            'name' => 'Pusat',
            'address' => 'Jl. Merdeka No. 10, Jakarta Pusat',
            'phone' => '02112345678',
            'status' => 'active',
        ]);

        $branchBsd = Branch::create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang BSD',
            'address' => 'Ruko BSD Sektor 7 Blok A/5, Tangerang',
            'phone' => '02198765432',
            'status' => 'active',
        ]);

        $branchBogor = Branch::create([
            'tenant_id' => $tenant->id,
            'name' => 'Cabang Bogor',
            'address' => 'Jl. Pajajaran No. 25, Bogor',
            'phone' => '0251123456',
            'status' => 'active',
        ]);

        // ─── USERS ───
        $admin = User::create([
            'tenant_id' => $tenant->id, 'branch_id' => $branchPusat->id,
            'name' => 'Super Admin', 'email' => 'admin@pos.test',
            'password' => Hash::make('password'), 'role' => 'super_admin', 'is_active' => true,
        ]);

        $kasirPusat = User::create([
            'tenant_id' => $tenant->id, 'branch_id' => $branchPusat->id,
            'name' => 'Kasir Pusat', 'email' => 'kasir@pos.test',
            'password' => Hash::make('password'), 'role' => 'kasir', 'is_active' => true,
        ]);

        User::create([
            'tenant_id' => $tenant->id, 'branch_id' => $branchPusat->id,
            'name' => 'Manajer Gudang', 'email' => 'gudang@pos.test',
            'password' => Hash::make('password'), 'role' => 'gudang', 'is_active' => true,
        ]);

        $kasirBsd = User::create([
            'tenant_id' => $tenant->id, 'branch_id' => $branchBsd->id,
            'name' => 'Kasir BSD', 'email' => 'kasirbsd@pos.test',
            'password' => Hash::make('password'), 'role' => 'kasir', 'is_active' => true,
        ]);

        $adminBsd = User::create([
            'tenant_id' => $tenant->id, 'branch_id' => $branchBsd->id,
            'name' => 'Admin BSD', 'email' => 'adminbsd@pos.test',
            'password' => Hash::make('password'), 'role' => 'admin_cabang', 'is_active' => true,
        ]);

        User::create([
            'tenant_id' => $tenant->id, 'branch_id' => $branchBogor->id,
            'name' => 'Admin Bogor', 'email' => 'bogor@pos.test',
            'password' => Hash::make('password'), 'role' => 'admin_cabang', 'is_active' => true,
        ]);

        // ─── CATEGORIES (tenant-wide) ───
        $categories = [];
        foreach (['Makanan Ringan', 'Minuman', 'Makanan Berat', 'Elektronik', 'Pakaian', 'Perlengkapan Rumah', 'Alat Tulis'] as $name) {
            $categories[] = Category::create(['tenant_id' => $tenant->id, 'name' => $name, 'slug' => Str::slug($name)]);
        }

        // ─── UNITS (tenant-wide) ───
        Unit::insert([
            ['name' => 'Pieces', 'short' => 'pcs'],
            ['name' => 'Kilogram', 'short' => 'kg'],
            ['name' => 'Liter', 'short' => 'L'],
            ['name' => 'Meter', 'short' => 'm'],
            ['name' => 'Pack', 'short' => 'pack'],
        ]);
        $defaultUnit = Unit::first();

        // ─── PRODUCTS (tenant-wide, no branch_id) ───
        $products = [];
        $productData = [
            ['name' => 'Makanan Ringan', 'items' => [
                ['Chitato Sapi Panggang 68g', 'CHT001', 8500, 12000, 20],
                ['Qtela Balado 85g', 'QTL001', 7500, 11000, 15],
                ['Taro Net 120g', 'TRO001', 9000, 13000, 10],
                ['Good Time Cookies 90g', 'GTM001', 7000, 10500, 12],
                ['Roti Tawar Sariroti', 'ROT001', 11000, 16000, 8],
            ]],
            ['name' => 'Minuman', 'items' => [
                ['Coca Cola 390ml', 'CCL001', 4500, 7000, 30],
                ['Teh Botol Sosro 500ml', 'TBS001', 4000, 6500, 25],
                ['Aqua 600ml', 'AQU001', 2500, 4000, 40],
                ['Kopi ABC Susu 200ml', 'KPC001', 3500, 5500, 20],
                ['Pocari Sweat 500ml', 'PCR001', 5500, 8000, 15],
            ]],
            ['name' => 'Makanan Berat', 'items' => [
                ['Indomie Goreng 85g', 'IND001', 2800, 4500, 50],
                ['Nasi Kotak Ayam Goreng', 'NAS001', 15000, 25000, 10],
                ['Mie Ayam Ceker', 'MIE001', 12000, 20000, 8],
                ['Bakso Sapi 1kg', 'BKS001', 35000, 50000, 5],
            ]],
            ['name' => 'Elektronik', 'items' => [
                ['Charger USB Type-C 20W', 'CHR001', 25000, 45000, 10],
                ['Kabel Data USB-C 1m', 'KBL001', 12000, 22000, 15],
                ['Power Bank 10000mAh', 'PWB001', 80000, 125000, 5],
                ['Mouse Wireless Logitech', 'MSL001', 95000, 150000, 3],
            ]],
            ['name' => 'Pakaian', 'items' => [
                ['Kaos Polos Hitam', 'KOS001', 35000, 55000, 15],
                ['Kemeja Flanel Pria', 'KEM001', 55000, 85000, 8],
                ['Jaket Hoodie Premium', 'JKT001', 90000, 145000, 5],
            ]],
            ['name' => 'Perlengkapan Rumah', 'items' => [
                ['Sabun Cuci Piring 450ml', 'SCP001', 8000, 13000, 20],
                ['Sapu Lantai', 'SPU001', 15000, 25000, 10],
                ['Lampu LED 10W', 'LMP001', 18000, 30000, 12],
                ['Keset Karet', 'KST001', 12000, 20000, 10],
            ]],
            ['name' => 'Alat Tulis', 'items' => [
                ['Buku Tulis 38 Lembar', 'BKT001', 3000, 5500, 40],
                ['Pulpen Standar Hitam', 'PLP001', 2000, 3500, 50],
                ['Spidol Whiteboard', 'SPD001', 5000, 8500, 15],
                ['Kertas HVS A4 70gr', 'KRT001', 35000, 50000, 5],
            ]],
        ];

        foreach ($productData as $group) {
            $cat = collect($categories)->firstWhere('name', $group['name']);
            foreach ($group['items'] as [$name, $sku, $buy, $sell, $minStock]) {
                $product = Product::create([
                    'tenant_id' => $tenant->id, 'category_id' => $cat->id, 'unit_id' => $defaultUnit->id,
                    'name' => $name, 'sku' => $sku,
                    'barcode' => '89' . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT),
                    'buy_price' => $buy, 'sell_price' => $sell, 'min_stock' => $minStock, 'is_active' => true,
                ]);
                $products[] = $product;
                if (in_array($name, ['Taro Net 120g', 'Teh Botol Sosro 500ml', 'Kaos Polos Hitam'])) {
                    ProductVariant::create(['product_id' => $product->id, 'name' => 'Original', 'sku' => $sku . '-ORG', 'buy_price' => $buy, 'sell_price' => $sell, 'stock' => rand(5, 20)]);
                    ProductVariant::create(['product_id' => $product->id, 'name' => 'Varian Lain', 'sku' => $sku . '-VAR', 'buy_price' => $buy + 1000, 'sell_price' => $sell + 2000, 'stock' => rand(3, 15)]);
                }
            }
        }

        // ─── CUSTOMERS (tenant-wide) ───
        $customers = [];
        foreach ([
            ['Budi Santoso', '081234567890', 'budi@gmail.com', 'Jl. Anggrek No. 5, Jakarta', 'regular', true, true],
            ['Siti Nurhaliza', '082345678901', 'siti@yahoo.com', 'Jl. Melati No. 10, Depok', 'silver', true, true],
            ['Ahmad Rizki', '083456789012', 'ahmad@gmail.com', 'Jl. Kenanga No. 15, Tangerang', 'gold', true, true],
            ['Dewi Lestari', '084567890123', 'dewi@outlook.com', 'Jl. Mawar No. 20, Bekasi', 'regular', true, false],
            ['Rudi Hartono', '085678901234', 'rudi@gmail.com', 'Jl. Dahlia No. 8, Jakarta', 'silver', true, true],
            ['Customer Umum', null, null, null, 'regular', true, false],
        ] as [$name, $phone, $email, $address, $tier, $isActive, $isMember]) {
            $customers[] = Customer::create([
                'tenant_id' => $tenant->id, 'name' => $name, 'phone' => $phone,
                'email' => $email, 'address' => $address, 'is_active' => $isActive,
                'is_member' => $isMember, 'points' => rand(0, 500), 'member_tier' => $tier,
            ]);
        }

        // ─── SUPPLIERS (tenant-wide) ───
        foreach ([
            ['PT Indofood Sukses Makmur', '0212345678', 'indofood@gmail.com', 'Jl. Jend. Sudirman, Jakarta', 0],
            ['PT Unilever Indonesia', '0213456789', 'unilever@gmail.com', 'Jl. Gatot Subroto, Jakarta', 0],
            ['PT Nestlé Indonesia', '0214567890', 'nestle@gmail.com', 'Jl. HR Rasuna Said, Jakarta', 500000],
            ['UD Sinar Jaya', '0221234567', 'sinarjaya@gmail.com', 'Jl. Braga, Bandung', 250000],
        ] as [$name, $phone, $email, $address, $balance]) {
            Supplier::create([
                'tenant_id' => $tenant->id, 'name' => $name, 'phone' => $phone,
                'email' => $email, 'address' => $address, 'opening_balance' => $balance,
            ]);
        }

        // ─── PAYMENT METHODS (tenant-wide) ───
        PaymentMethod::insert([
            ['name' => 'Tunai', 'code' => 'cash'],
            ['name' => 'Debit', 'code' => 'debit'],
            ['name' => 'Kredit', 'code' => 'credit'],
            ['name' => 'QRIS', 'code' => 'qris'],
        ]);

        // ─── PROMOTIONS (tenant-wide) ───
        $makananRinganCat = collect($categories)->firstWhere('name', 'Makanan Ringan');
        $minumanCat = collect($categories)->firstWhere('name', 'Minuman');

        $promo1 = Promotion::create([
            'tenant_id' => $tenant->id, 'name' => 'Diskon 10% Makanan Ringan',
            'category_id' => $makananRinganCat->id, 'type' => 'percent',
            'value' => 10, 'min_purchase' => 0,
            'start_date' => now()->subDays(30), 'end_date' => now()->addDays(30), 'is_active' => true,
        ]);

        $promo2 = Promotion::create([
            'tenant_id' => $tenant->id, 'name' => 'Beli 2 Minuman Gratis 1',
            'type' => 'bundle', 'value' => 0, 'min_purchase' => 15000,
            'start_date' => now()->subDays(30), 'end_date' => now()->addDays(30), 'is_active' => true,
        ]);

        $minumanProducts = Product::where('tenant_id', $tenant->id)
            ->where('category_id', $minumanCat->id)
            ->get();
        foreach ($minumanProducts as $mp) {
            $promo2->items()->create(['product_id' => $mp->id, 'discount_value' => $mp->sell_price]);
        }

        Promotion::create([
            'tenant_id' => $tenant->id, 'name' => 'Diskon 5% Semua Pembelian',
            'type' => 'percent', 'value' => 5, 'min_purchase' => 50000,
            'start_date' => now()->subDays(30), 'end_date' => now()->addDays(30), 'is_active' => true,
        ]);

        // ─── BRANCH-SPECIFIC DATA ───
        $productPool = Product::where('tenant_id', $tenant->id)->get();
        $suppliers = Supplier::where('tenant_id', $tenant->id)->get();
        $paymentMethods = ['cash', 'debit', 'credit', 'qris'];

        // Helper: create branch-specific data
        $seedBranch = function (Branch $branch, User $cashier, int $totalDays, string $txRange, string $poPrefix, array $poSeed) use ($tenant, $productPool, $suppliers, $customers, $paymentMethods, $admin) {
            [$txMin, $txMax] = explode(',', $txRange);

            // ── Purchase Orders ──
            foreach ($poSeed as $i => [$status, $note, $daysAgo]) {
                $po = PurchaseOrder::create([
                    'tenant_id' => $tenant->id, 'branch_id' => $branch->id,
                    'supplier_id' => $suppliers->random()->id, 'user_id' => $admin->id,
                    'po_number' => $poPrefix . str_pad((string)($i + 1), 3, '0', STR_PAD_LEFT),
                    'status' => $status, 'total' => 0, 'notes' => $note,
                    'created_at' => now()->subDays($daysAgo),
                ]);
                $total = 0;
                foreach ($productPool->random(rand(3, 4)) as $p) {
                    $qty = rand(8, 30);
                    $price = $p->buy_price;
                    $received = $status === 'completed' ? $qty : ($status === 'partial' ? rand(1, max(1, $qty - 1)) : 0);
                    $total += $qty * $price;
                    PurchaseOrderItem::create([
                        'purchase_order_id' => $po->id, 'product_id' => $p->id,
                        'qty' => $qty, 'price' => $price, 'received_qty' => $received,
                    ]);
                    if ($received > 0) {
                        StockMutation::create([
                            'tenant_id' => $tenant->id, 'branch_id' => $branch->id,
                            'product_id' => $p->id, 'user_id' => $admin->id,
                            'type' => 'in', 'reference_type' => 'purchase', 'reference_id' => $po->id,
                            'qty' => $received, 'stock_before' => 0, 'stock_after' => $received,
                            'note' => 'Receiving ' . $po->po_number,
                            'created_at' => now()->subDays(max(1, $daysAgo - 2)),
                        ]);
                    }
                }
                $po->update(['total' => $total]);
            }

            // ── Transactions ──
            for ($day = $totalDays; $day >= 0; $day--) {
                $txCount = rand((int)$txMin, (int)$txMax);
                for ($j = 0; $j < $txCount; $j++) {
                    $date = now()->subDays($day)->setTime(rand(8, 21), rand(0, 59), 0);
                    $pm = $paymentMethods[array_rand($paymentMethods)];
                    $customer = $customers[rand(0, count($customers) - 1)];

                    $subtotal = 0;
                    $itemsData = [];
                    foreach ($productPool->random(rand(1, 5)) as $prod) {
                        $qty = rand(1, 3);
                        $price = $prod->sell_price;
                        $disc = rand(0, 1) ? 0 : rand(500, 1500);
                        $subItem = ($price * $qty) - $disc;
                        $subtotal += $subItem;
                        $itemsData[] = [
                            'product_id' => $prod->id, 'product_name' => $prod->name,
                            'variant_name' => null, 'price' => $price, 'buy_price' => $prod->buy_price,
                            'qty' => $qty, 'discount' => $disc, 'subtotal' => $subItem,
                        ];
                    }

                    $grandTotal = $subtotal;
                    $paid = $grandTotal + (rand(0, 1) ? rand(0, 10000) : 0);

                    $tx = Transaction::create([
                        'tenant_id' => $tenant->id, 'branch_id' => $branch->id,
                        'user_id' => $cashier->id, 'customer_id' => $customer->id,
                        'invoice_no' => 'INV-' . $date->format('Ymd') . '-' . strtoupper(Str::random(6)),
                        'subtotal' => $subtotal, 'discount_total' => 0, 'tax_total' => 0,
                        'grand_total' => $grandTotal, 'payment_method' => $pm,
                        'payment_amount' => $paid, 'change_amount' => $paid - $grandTotal,
                        'status' => rand(1, 25) === 1 ? 'void' : 'completed',
                        'created_at' => $date, 'updated_at' => $date,
                    ]);

                    foreach ($itemsData as $item) {
                        TransactionItem::create([
                            'transaction_id' => $tx->id,
                            'product_id' => $item['product_id'], 'product_variant_id' => null,
                            'product_name' => $item['product_name'], 'variant_name' => $item['variant_name'],
                            'price' => $item['price'], 'buy_price' => $item['buy_price'],
                            'qty' => $item['qty'], 'discount' => $item['discount'], 'subtotal' => $item['subtotal'],
                            'created_at' => $date, 'updated_at' => $date,
                        ]);

                        StockMutation::create([
                            'tenant_id' => $tenant->id, 'branch_id' => $branch->id,
                            'product_id' => $item['product_id'], 'user_id' => $cashier->id,
                            'type' => 'out', 'reference_type' => 'sale', 'reference_id' => $tx->id,
                            'qty' => $item['qty'], 'stock_before' => 0, 'stock_after' => 0,
                            'note' => 'Penjualan ' . $tx->invoice_no,
                            'created_at' => $date, 'updated_at' => $date,
                        ]);
                    }

                    if ($customer->name !== 'Customer Umum') {
                        $customer->increment('points', (int)($grandTotal / 1000));
                    }
                }
            }
        };

        // Pusat: heavy traffic (14 days, 3-5 tx/day, 4 PO)
        $seedBranch($branchPusat, $kasirPusat, 14, '3,5', 'PO-PST-', [
            ['completed', 'Stok awal bulan', 12],
            ['completed', 'Restock minuman', 7],
            ['partial', 'Pesanan elektronik', 4],
            ['draft', 'Persiapan promo', 1],
        ]);

        // BSD: medium traffic (10 days, 2-4 tx/day, 3 PO)
        $seedBranch($branchBsd, $kasirBsd, 10, '2,4', 'PO-BSD-', [
            ['completed', 'Pembukaan cabang', 8],
            ['partial', 'Restock makanan', 3],
            ['sent', 'Pesanan alat tulis', 1],
        ]);

        // Bogor: light traffic (7 days, 1-3 tx/day, 2 PO)
        $seedBranch($branchBogor, $admin, 7, '1,3', 'PO-BGR-', [
            ['sent', 'Pembukaan cabang baru', 3],
            ['draft', 'Persiapan inventaris', 1],
        ]);

        // ─── SUMMARY ───
        $txCount = Transaction::where('tenant_id', $tenant->id)->count();
        $poCount = PurchaseOrder::where('tenant_id', $tenant->id)->count();

        $this->command->info('==================================================');
        $this->command->info('  Database seeded successfully!');
        $this->command->info('==================================================');
        $this->command->info('  Admin       : admin@pos.test / password');
        $this->command->info('  Kasir Pusat : kasir@pos.test / password');
        $this->command->info('  Kasir BSD   : kasirbsd@pos.test / password');
        $this->command->info('  Admin Bogor : bogor@pos.test / password');
        $this->command->info('==================================================');
        $this->command->info('  3 Cabang: Pusat | Cabang BSD | Cabang Bogor');
        $this->command->info("  Products    : " . count($products));
        $this->command->info("  Customers   : " . count($customers));
        $this->call(RolesAndPermissionsSeeder::class);

        $this->command->info("  Suppliers   : 4 supplier");
        $this->command->info("  Transactions: ~{$txCount} transaksi (terbagi 3 cabang)");
        $this->command->info("  Purchase Orders: {$poCount} PO (terbagi 3 cabang)");
        $this->command->info('  Promotions  : 3 promo aktif');
        $this->command->info('==================================================');
    }
}
