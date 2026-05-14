<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Product;
use App\Models\Customer;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(private ReportService $reportService) {}

    public function summary(Request $request)
    {
        $tenantId = $request->tenant_id;
        $branchId = $request->branch_id;

        $key = 'pos:dashboard:' . $tenantId . ':' . ($branchId ?? 'all');

        $data = Cache::remember($key, 180, function () use ($tenantId, $branchId) {
            $query = Transaction::where('transactions.tenant_id', $tenantId)->where('transactions.status', 'completed');
            if ($branchId) $query->where('transactions.branch_id', $branchId);

            $todaySales = (clone $query)->whereDate('transactions.created_at', today())->sum('transactions.grand_total');
            $todayTransactions = (clone $query)->whereDate('transactions.created_at', today())->count();

            $thisMonth = (clone $query)->whereMonth('transactions.created_at', now()->month)->whereYear('transactions.created_at', now()->year)->sum('transactions.grand_total');
            $lastMonth = (clone $query)->whereMonth('transactions.created_at', now()->subMonth()->month)->whereYear('transactions.created_at', now()->subMonth()->year)->sum('transactions.grand_total');

            $salesChart = (clone $query)
                ->selectRaw("DATE(transactions.created_at) as date, SUM(transactions.grand_total) as total, COUNT(*) as count")
                ->whereDate('transactions.created_at', '>=', now()->subDays(13))
                ->groupByRaw("DATE(transactions.created_at)")
                ->orderBy('date')
                ->get();

            $recentTransactions = (clone $query)
                ->with(['user', 'customer'])
                ->latest('transactions.created_at')
                ->limit(5)
                ->get(['transactions.id', 'transactions.invoice_no', 'transactions.grand_total', 'transactions.payment_method', 'transactions.status', 'transactions.created_at', 'transactions.user_id', 'transactions.customer_id']);

            $totalProducts = Product::where('tenant_id', $tenantId)->count();
            $totalCustomers = Customer::where('tenant_id', $tenantId)->count();

            $topProducts = $this->reportService->topProducts($tenantId, $branchId, 5);
            $stockSummary = $branchId ? $this->reportService->stockSummary($tenantId, $branchId) : ['low_stock' => 0, 'out_of_stock' => 0];

            return [
                'today_sales' => $todaySales,
                'today_transactions' => $todayTransactions,
                'total_products' => $totalProducts,
                'total_customers' => $totalCustomers,
                'this_month_sales' => $thisMonth,
                'last_month_sales' => $lastMonth,
                'sales_growth_percent' => $lastMonth > 0 ? round(($thisMonth - $lastMonth) / $lastMonth * 100, 1) : 0,
                'sales_chart' => $salesChart,
                'recent_transactions' => $recentTransactions,
                'top_products' => $topProducts,
                'low_stock_count' => $stockSummary['low_stock'],
                'out_of_stock_count' => $stockSummary['out_of_stock'],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Dashboard summary',
        ]);
    }
}

