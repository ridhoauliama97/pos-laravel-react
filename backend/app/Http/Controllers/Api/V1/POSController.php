<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\Hold;
use App\Models\Transaction;
use App\Models\UserActivityLog;
use App\Services\POSService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class POSController extends Controller
{
    public function __construct(private POSService $posService) {}

    public function checkout(CheckoutRequest $request)
    {
        $transaction = $this->posService->processCheckout(
            $request->validated(),
            $request->branch_id,
            $request->user()->id,
            $request->tenant_id
        );

        $this->invalidateCache($request->tenant_id, $request->branch_id);

        UserActivityLog::create([
            'tenant_id' => $request->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'checkout',
            'description' => 'Checkout transaksi ' . $transaction->invoice_no . ' sebesar ' . number_format($transaction->grand_total, 0, ',', '.'),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $transaction->load('items'),
            'message' => 'Transaksi berhasil',
        ], 201);
    }

    public function history(Request $request)
    {
        $query = Transaction::with(['items', 'user', 'customer'])
            ->where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id);

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if (!$request->date_from && !$request->date_to && $request->date) {
            $query->whereDate('created_at', $request->date);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $transactions = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $transactions->items(),
            'message' => 'Riwayat transaksi',
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function export(Request $request)
    {
        $query = Transaction::with(['items', 'user', 'customer'])
            ->where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id);

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $transactions,
            'message' => 'Data export transaksi',
        ]);
    }

    public function show(Request $request, $id)
    {
        $transaction = Transaction::with(['items', 'user', 'customer'])
            ->where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $transaction,
            'message' => 'Detail transaksi',
        ]);
    }

    public function void(Request $request, $id)
    {
        $transaction = Transaction::where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id)
            ->where('status', 'completed')
            ->findOrFail($id);

        if ($transaction->created_at->isBefore(now()->startOfDay())) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya bisa void transaksi hari yang sama',
            ], 422);
        }

        $this->posService->voidTransaction($transaction);

        $this->invalidateCache($request->tenant_id, $request->branch_id);

        UserActivityLog::create([
            'tenant_id' => $request->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'void',
            'description' => 'Void transaksi ' . $transaction->invoice_no,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $transaction->fresh(),
            'message' => 'Transaksi berhasil di-void',
        ]);
    }

    public function hold(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array',
            'total' => 'required|numeric',
        ]);

        $hold = Hold::create([
            'tenant_id' => $request->tenant_id,
            'branch_id' => $request->branch_id,
            'user_id' => $request->user()->id,
            'items' => $data['items'],
            'total' => $data['total'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $hold,
            'message' => 'Transaksi di-hold',
        ], 201);
    }

    public function holds(Request $request)
    {
        $holds = Hold::where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id)
            ->where('user_id', $request->user()->id)
            ->latest()
            ->take(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $holds,
            'message' => 'Daftar hold transaksi',
        ]);
    }

    public function resume(Request $request, $id)
    {
        $hold = Hold::where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id)
            ->findOrFail($id);

        $hold->delete();

        return response()->json([
            'success' => true,
            'data' => $hold,
            'message' => 'Hold transaksi di-resume',
        ]);
    }

    private function invalidateCache(int $tenantId, ?int $branchId): void
    {
        $b = $branchId ?? 'all';
        Cache::forget('pos:dashboard:' . $tenantId . ':' . $b);
        Cache::forget('r:topprods:' . $tenantId . ':' . $b . ':5');
        Cache::forget('r:topprods:' . $tenantId . ':' . $b . ':10');
    }
}
