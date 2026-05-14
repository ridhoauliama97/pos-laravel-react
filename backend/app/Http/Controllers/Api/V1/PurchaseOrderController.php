<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrderRequest;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReceiving;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'user', 'items'])
            ->where('tenant_id', $request->tenant_id)
            ->where('branch_id', $request->branch_id);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $orders = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'message' => 'Daftar purchase order',
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function store(PurchaseOrderRequest $request)
    {
        return DB::transaction(function () use ($request) {
            $poNumber = 'PO-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            $total = collect($request->items)->sum(fn($i) => $i['qty'] * $i['price']);

            $po = PurchaseOrder::create([
                'tenant_id' => $request->tenant_id,
                'branch_id' => $request->branch_id,
                'supplier_id' => $request->supplier_id,
                'user_id' => $request->user()->id,
                'po_number' => $poNumber,
                'status' => 'draft',
                'total' => $total,
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $item) {
                $po->items()->create($item);
            }

            return response()->json([
                'success' => true,
                'data' => $po->load(['items', 'supplier']),
                'message' => 'Purchase order berhasil dibuat',
            ], 201);
        });
    }

    public function show(Request $request, $id)
    {
        $po = PurchaseOrder::with(['items.product', 'supplier', 'user', 'receivings'])
            ->where('tenant_id', $request->tenant_id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $po,
            'message' => 'Detail purchase order',
        ]);
    }

    public function send(Request $request, $id)
    {
        $po = PurchaseOrder::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $po->update(['status' => 'sent']);

        return response()->json([
            'success' => true,
            'data' => $po,
            'message' => 'PO berhasil dikirim ke supplier',
        ]);
    }

    public function receive(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $po = PurchaseOrder::with('items')
                ->where('tenant_id', $request->tenant_id)
                ->findOrFail($id);

            $receiving = PurchaseReceiving::create([
                'tenant_id' => $request->tenant_id,
                'branch_id' => $request->branch_id,
                'purchase_order_id' => $po->id,
                'user_id' => $request->user()->id,
                'notes' => $request->notes,
            ]);

            $receivedItems = $request->input('items');

            foreach ($po->items as $item) {
                if ($receivedItems) {
                    $match = collect($receivedItems)->firstWhere('product_id', $item->product_id);
                    $qty = $match ? (int)$match['qty'] : 0;
                } else {
                    $qty = $item->qty - $item->received_qty;
                }

                if ($qty <= 0) continue;

                $item->increment('received_qty', $qty);

                \App\Models\StockMutation::create([
                    'tenant_id' => $request->tenant_id,
                    'branch_id' => $request->branch_id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'user_id' => $request->user()->id,
                    'type' => 'in',
                    'reference_type' => 'purchase',
                    'reference_id' => $po->id,
                    'qty' => $qty,
                    'stock_before' => 0,
                    'stock_after' => 0,
                    'note' => 'Receiving ' . $po->po_number,
                ]);
            }

            $po->refresh();

            if ($po->items->every(fn($i) => $i->received_qty >= $i->qty)) {
                $po->update(['status' => 'completed']);
            } elseif ($po->items->sum('received_qty') > 0) {
                $po->update(['status' => 'partial']);
            }

            return response()->json([
                'success' => true,
                'data' => $receiving,
                'message' => 'Barang berhasil diterima',
            ]);
        });
    }
}
