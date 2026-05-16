<?php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function salesSummary(int $tenantId, ?int $branchId, ?string $startDate, ?string $endDate): array
    {
        $build = function () use ($tenantId, $branchId, $startDate, $endDate) {
            $query = Transaction::where('transactions.tenant_id', $tenantId)
                ->where('transactions.status', 'completed');

            if ($branchId) {
                $query->where('transactions.branch_id', $branchId);
            }
            if ($startDate) {
                $query->whereDate('transactions.created_at', '>=', $startDate);
            }
            if ($endDate) {
                $query->whereDate('transactions.created_at', '<=', $endDate);
            }

            $totalSales = (clone $query)->sum('transactions.grand_total');
            $totalTransactions = (clone $query)->count('transactions.id');
            $totalItems = (clone $query)
                ->join('transaction_items', 'transactions.id', '=', 'transaction_items.transaction_id')
                ->sum('transaction_items.qty');
            $avgTransaction = $totalTransactions > 0 ? $totalSales / $totalTransactions : 0;

            $dailySales = (clone $query)
                ->selectRaw("DATE(transactions.created_at) as date, SUM(transactions.grand_total) as total, COUNT(*) as count")
                ->groupByRaw("DATE(transactions.created_at)")
                ->orderBy('date')
                ->get();

            return [
                'total_sales' => $totalSales,
                'total_transactions' => $totalTransactions,
                'total_items_sold' => $totalItems,
                'average_transaction' => $avgTransaction,
                'daily_sales' => $dailySales,
            ];
        };

        if ($startDate || $endDate) {
            return $build();
        }

        $key = 'r:sales:' . $tenantId . ':' . ($branchId ?? 'all') . '::';
        return Cache::remember($key, 600, $build);
    }

    public function profitLoss(int $tenantId, ?int $branchId, string $startDate, string $endDate): array
    {
        $key = 'r:pl:' . $tenantId . ':' . ($branchId ?? 'all') . ':' . $startDate . ':' . $endDate;

        return Cache::remember($key, 600, function () use ($tenantId, $branchId, $startDate, $endDate) {
            $query = Transaction::where('tenant_id', $tenantId)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate]);

            if ($branchId) {
                $query->where('branch_id', $branchId);
            }

            $transactions = $query->with('items')->get();

            $totalSales = $transactions->sum('grand_total');
            $totalCOGS = $transactions->flatMap->items->sum(fn($item) => $item->buy_price * $item->qty);
            $grossProfit = $totalSales - $totalCOGS;
            $margin = $totalSales > 0 ? ($grossProfit / $totalSales) * 100 : 0;

            return [
                'total_sales' => $totalSales,
                'total_cogs' => $totalCOGS,
                'gross_profit' => $grossProfit,
                'margin_percent' => round($margin, 2),
                'transaction_count' => $transactions->count(),
            ];
        });
    }

    public function topProducts(int $tenantId, ?int $branchId, int $limit = 10): array
    {
        $key = 'r:topprods:' . $tenantId . ':' . ($branchId ?? 'all') . ':' . $limit;

        return Cache::remember($key, 600, function () use ($tenantId, $branchId, $limit) {
            $query = DB::table('transaction_items')
                ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                ->where('transactions.tenant_id', $tenantId)
                ->where('transactions.status', 'completed');

            if ($branchId) {
                $query->where('transactions.branch_id', $branchId);
            }

            return $query->selectRaw('
                    transaction_items.product_name,
                    SUM(transaction_items.qty) as total_qty,
                    SUM(transaction_items.subtotal) as total_revenue
                ')
                ->groupBy('transaction_items.product_name')
                ->orderByDesc('total_qty')
                ->limit($limit)
                ->get()
                ->toArray();
        });
    }

    public function stockSummary(int $tenantId, int $branchId): array
    {
        $key = 'r:stock:' . $tenantId . ':' . $branchId;

        return Cache::remember($key, 300, function () use ($tenantId, $branchId) {
            $lowStock = DB::table('products')
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->where('min_stock', '>', 0)
                ->whereRaw('(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = products.id) + COALESCE(products.stock, 0) <= min_stock')
                ->count();

            $outOfStock = DB::table('products')
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->whereRaw('(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = products.id) + COALESCE(products.stock, 0) = 0')
                ->count();

            return [
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
            ];
        });
    }

    public function forgetCache(int $tenantId, ?int $branchId): void
    {
        $b = $branchId ?? 'all';
        Cache::forget('r:sales:' . $tenantId . ':' . $b . '::');
        Cache::forget('r:topprods:' . $tenantId . ':' . $b . ':5');
        Cache::forget('r:topprods:' . $tenantId . ':' . $b . ':10');
        Cache::forget('r:stock:' . $tenantId . ':' . $branchId);
    }
}
