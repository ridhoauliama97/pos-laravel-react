<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\ReportService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService)
    {
    }

    public function sales(Request $request)
    {
        $data = $this->reportService->salesSummary(
            $request->tenant_id,
            $request->branch_id,
            $request->start_date,
            $request->end_date,
        );

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Laporan penjualan',
        ]);
    }

    public function profitLoss(Request $request)
    {
        $data = $this->reportService->profitLoss(
            $request->tenant_id,
            $request->branch_id,
            $request->start_date ?? now()->startOfMonth(),
            $request->end_date ?? now()->endOfMonth(),
        );

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Laporan laba rugi',
        ]);
    }

    public function topProducts(Request $request)
    {
        $data = $this->reportService->topProducts(
            $request->tenant_id,
            $request->branch_id,
            $request->limit ?? 10,
        );

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Produk terlaris',
        ]);
    }

    public function stock(Request $request)
    {
        $data = $this->reportService->stockSummary(
            $request->tenant_id,
            $request->branch_id,
        );

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Ringkasan stok',
        ]);
    }

    public function transactions(Request $request)
    {
        $query = Transaction::with(['items', 'user', 'customer'])
            ->where('tenant_id', $request->tenant_id);

        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $transactions = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $transactions->items(),
            'message' => 'Data transaksi',
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }
}
