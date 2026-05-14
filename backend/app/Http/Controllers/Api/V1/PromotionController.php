<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    public function index(Request $request)
    {
        $promotions = Promotion::with(['items', 'category'])
            ->where('tenant_id', $request->tenant_id)
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $promotions->items(),
            'message' => 'Daftar promo',
            'meta' => [
                'current_page' => $promotions->currentPage(),
                'last_page' => $promotions->lastPage(),
                'per_page' => $promotions->perPage(),
                'total' => $promotions->total(),
            ],
        ]);
    }

    public function active(Request $request)
    {
        $promotions = Promotion::with(['items', 'category'])
            ->where('tenant_id', $request->tenant_id)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get();

        return response()->json([
            'success' => true,
            'data' => $promotions,
            'message' => 'Promo aktif',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'type' => 'required|in:percent,fixed,bundle',
            'value' => 'required|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.discount_value' => 'nullable|numeric|min:0',
        ]);

        $promotion = Promotion::create([
            'tenant_id' => $request->tenant_id,
            'name' => $data['name'],
            'category_id' => $data['category_id'] ?? null,
            'type' => $data['type'],
            'value' => $data['value'],
            'min_purchase' => $data['min_purchase'] ?? 0,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
        ]);

        if (!empty($data['items'])) {
            foreach ($data['items'] as $item) {
                $promotion->items()->create($item);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $promotion->load('items'),
            'message' => 'Promo berhasil dibuat',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $promotion = Promotion::where('tenant_id', $request->tenant_id)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'type' => 'sometimes|in:percent,fixed,bundle',
            'value' => 'sometimes|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'is_active' => 'boolean',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.discount_value' => 'nullable|numeric|min:0',
        ]);

        $promotion->update($data);

        if ($request->has('items')) {
            $promotion->items()->delete();
            foreach ($request->items as $item) {
                $promotion->items()->create($item);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $promotion->fresh()->load('items'),
            'message' => 'Promo berhasil diupdate',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $promotion = Promotion::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $promotion->items()->delete();
        $promotion->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Promo berhasil dihapus',
        ]);
    }
}
