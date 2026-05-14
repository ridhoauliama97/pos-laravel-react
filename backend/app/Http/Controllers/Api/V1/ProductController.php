<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'unit', 'variants'])
            ->where('tenant_id', $request->tenant_id);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%")
                  ->orWhere('barcode', 'like', "%{$request->search}%");
            });
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->stock_status) {
            $query->where(function ($q) use ($request) {
                $totalStock = DB::raw('(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_variants.product_id = products.id)');
                match ($request->stock_status) {
                    'habis' => $q->where($totalStock, 0),
                    'low' => $q->where($totalStock, '>', 0)->where($totalStock, '<=', DB::raw('products.min_stock')),
                    'ready' => $q->where($totalStock, '>', DB::raw('products.min_stock')),
                    default => null,
                };
            });
        }

        $products = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'message' => 'Daftar produk',
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function store(ProductRequest $request)
    {
        $data = [
            'tenant_id' => $request->tenant_id,
            'category_id' => $request->category_id,
            'unit_id' => $request->unit_id,
            'name' => $request->name,
            'sku' => $request->sku,
            'barcode' => $request->barcode,
            'buy_price' => $request->buy_price,
            'sell_price' => $request->sell_price,
            'min_stock' => $request->min_stock ?? 0,
            'is_active' => $request->is_active ?? true,
        ];

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = Storage::url($path);
        } elseif ($request->filled('image')) {
            $data['image'] = $request->image;
        }

        $product = Product::create($data);

        if ($request->variants) {
            foreach ($request->variants as $variant) {
                $product->variants()->create($variant);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $product->load(['category', 'unit', 'variants']),
            'message' => 'Produk berhasil dibuat',
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $product = Product::with(['category', 'unit', 'variants'])
            ->where('tenant_id', $request->tenant_id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $product,
            'message' => 'Detail produk',
        ]);
    }

    public function update(ProductRequest $request, $id)
    {
        $product = Product::where('tenant_id', $request->tenant_id)->findOrFail($id);

        $data = $request->only([
            'category_id', 'unit_id', 'name', 'sku', 'barcode',
            'buy_price', 'sell_price', 'min_stock', 'is_active',
        ]);

        if ($request->hasFile('image')) {
            if ($product->image) {
                $oldPath = str_replace(Storage::url(''), '', $product->image);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = Storage::url($path);
        } elseif ($request->has('image') && empty($request->image)) {
            if ($product->image) {
                $oldPath = str_replace(Storage::url(''), '', $product->image);
                Storage::disk('public')->delete($oldPath);
            }
            $data['image'] = null;
        }

        $product->update($data);

        if ($request->variants) {
            $product->variants()->delete();
            foreach ($request->variants as $variant) {
                $product->variants()->create($variant);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $product->fresh()->load(['category', 'unit', 'variants']),
            'message' => 'Produk berhasil diupdate',
        ]);
    }

    public function stats(Request $request)
    {
        $query = Product::where('tenant_id', $request->tenant_id);

        $total = (clone $query)->count();
        $active = (clone $query)->where('is_active', true)->count();

        $readyStock = (clone $query)->where('is_active', true)
            ->where(function ($q) {
                $totalStock = DB::raw('(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_variants.product_id = products.id)');
                $q->where($totalStock, '>', DB::raw('products.min_stock'));
            })->count();

        $lowStock = (clone $query)->where('is_active', true)
            ->where(function ($q) {
                $totalStock = DB::raw('(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_variants.product_id = products.id)');
                $q->where($totalStock, '>', 0)
                  ->where($totalStock, '<=', DB::raw('products.min_stock'));
            })->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'ready_stock' => $readyStock,
                'low_stock' => $lowStock,
            ],
            'message' => 'Statistik produk',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $product = Product::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $product->variants()->delete();
        $product->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Produk berhasil dihapus',
        ]);
    }
}
