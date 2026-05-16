<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StockMutation;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StockMutationController extends Controller
{
    public function __construct(private InventoryService $inventoryService) {}

    public function index(Request $request)
    {
        $query = StockMutation::with(['product', 'variant', 'user', 'toBranch'])
            ->where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id);

        if ($request->product_id) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->reference_type) {
            $query->where('reference_type', $request->reference_type);
        }

        if ($request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $mutations = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $mutations->items(),
            'message' => 'Mutasi stok',
            'meta' => [
                'current_page' => $mutations->currentPage(),
                'last_page' => $mutations->lastPage(),
                'per_page' => $mutations->perPage(),
                'total' => $mutations->total(),
            ],
        ]);
    }

    public function adjust(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'type' => 'required|in:in,out',
            'qty' => 'required|integer|min:1',
            'note' => 'required|string',
            'to_branch_id' => 'required_if:type,out|exists:branches,id',
        ]);

        $this->inventoryService->adjustStock(
            $request->tenant_id,
            $request->branch_id,
            $request->user()->id,
            $data['product_id'],
            $data['product_variant_id'] ?? null,
            $data['type'],
            $data['qty'],
            $data['note'],
            $data['to_branch_id'] ?? null,
        );

        Cache::forget('r:stock:' . $request->tenant_id . ':' . $request->branch_id);
        Cache::forget('pos:dashboard:' . $request->tenant_id . ':' . ($request->branch_id ?? 'all'));

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Stok berhasil disesuaikan',
        ]);
    }
}
