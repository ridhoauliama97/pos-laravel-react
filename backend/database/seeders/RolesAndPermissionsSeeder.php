<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::firstOr(fn () => Tenant::factory()->create());

        // ─── PERMISSIONS ───
        $permissionDefs = [
            // Dashboard
            ['name' => 'dashboard.view', 'display_name' => 'Lihat Dashboard', 'group' => 'Dashboard'],

            // POS
            ['name' => 'pos.access', 'display_name' => 'Akses POS', 'group' => 'POS'],
            ['name' => 'pos.history', 'display_name' => 'Lihat Riwayat Transaksi', 'group' => 'POS'],

            // Products
            ['name' => 'products.view', 'display_name' => 'Lihat Produk', 'group' => 'Produk'],
            ['name' => 'products.create', 'display_name' => 'Tambah Produk', 'group' => 'Produk'],
            ['name' => 'products.edit', 'display_name' => 'Edit Produk', 'group' => 'Produk'],
            ['name' => 'products.delete', 'display_name' => 'Hapus Produk', 'group' => 'Produk'],

            // Categories
            ['name' => 'categories.view', 'display_name' => 'Lihat Kategori', 'group' => 'Kategori'],
            ['name' => 'categories.manage', 'display_name' => 'Kelola Kategori', 'group' => 'Kategori'],

            // Customers
            ['name' => 'customers.view', 'display_name' => 'Lihat Pelanggan', 'group' => 'Pelanggan'],
            ['name' => 'customers.create', 'display_name' => 'Tambah Pelanggan', 'group' => 'Pelanggan'],
            ['name' => 'customers.edit', 'display_name' => 'Edit Pelanggan', 'group' => 'Pelanggan'],
            ['name' => 'customers.delete', 'display_name' => 'Hapus Pelanggan', 'group' => 'Pelanggan'],

            // Suppliers
            ['name' => 'suppliers.view', 'display_name' => 'Lihat Supplier', 'group' => 'Supplier'],
            ['name' => 'suppliers.manage', 'display_name' => 'Kelola Supplier', 'group' => 'Supplier'],

            // Stock
            ['name' => 'stock.view', 'display_name' => 'Lihat Stok', 'group' => 'Stok'],
            ['name' => 'stock.mutations', 'display_name' => 'Mutasi Stok', 'group' => 'Stok'],
            ['name' => 'stock.adjustments', 'display_name' => 'Adjustment Stok', 'group' => 'Stok'],

            // Purchase Orders
            ['name' => 'purchase_orders.view', 'display_name' => 'Lihat Pembelian', 'group' => 'Pembelian'],
            ['name' => 'purchase_orders.create', 'display_name' => 'Tambah Pembelian', 'group' => 'Pembelian'],
            ['name' => 'purchase_orders.edit', 'display_name' => 'Edit Pembelian', 'group' => 'Pembelian'],

            // Reports
            ['name' => 'reports.view', 'display_name' => 'Lihat Laporan', 'group' => 'Laporan'],

            // Settings
            ['name' => 'settings.access', 'display_name' => 'Akses Pengaturan', 'group' => 'Pengaturan'],
            ['name' => 'settings.company', 'display_name' => 'Pengaturan Perusahaan', 'group' => 'Pengaturan'],
            ['name' => 'settings.users', 'display_name' => 'Kelola User', 'group' => 'Pengaturan'],
            ['name' => 'settings.branches', 'display_name' => 'Kelola Cabang', 'group' => 'Pengaturan'],
            ['name' => 'settings.promotions', 'display_name' => 'Kelola Promo', 'group' => 'Pengaturan'],
            ['name' => 'settings.roles', 'display_name' => 'Kelola Role', 'group' => 'Pengaturan'],
        ];

        $permissions = [];
        foreach ($permissionDefs as $def) {
            $permissions[] = Permission::firstOrCreate(
                ['name' => $def['name']],
                $def
            );
        }

        // ─── SYSTEM ROLES ───
        $roleDefs = [
            ['name' => 'super_admin', 'display_name' => 'Super Admin', 'description' => 'Akses penuh ke semua fitur'],
            ['name' => 'admin_cabang', 'display_name' => 'Admin Cabang', 'description' => 'Mengelola operasional cabang'],
            ['name' => 'kasir', 'display_name' => 'Kasir', 'description' => 'Melakukan transaksi POS'],
            ['name' => 'gudang', 'display_name' => 'Gudang', 'description' => 'Mengelola stok dan produk'],
        ];

        $allPermissionIds = collect($permissions)->pluck('id');

        foreach ($roleDefs as $def) {
            $role = Role::firstOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $def['name']],
                [
                    'tenant_id' => $tenant->id,
                    'display_name' => $def['display_name'],
                    'description' => $def['description'],
                    'is_system' => true,
                ]
            );

            // Super Admin gets ALL permissions
            if ($def['name'] === 'super_admin') {
                $role->permissions()->sync($allPermissionIds);
            }
        }
    }
}
