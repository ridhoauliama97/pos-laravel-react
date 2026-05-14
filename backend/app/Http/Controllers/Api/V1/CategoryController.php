<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = Category::where('tenant_id', $request->tenant_id)
            ->withCount('products')
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $categories->items(),
            'message' => 'Daftar kategori',
            'meta' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255']);

        $category = Category::create([
            'tenant_id' => $request->tenant_id,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
        ]);

        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => 'Kategori berhasil dibuat',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::where('tenant_id', $request->tenant_id)->findOrFail($id);

        $data = $request->validate(['name' => 'required|string|max:255']);
        $category->update([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
        ]);

        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => 'Kategori berhasil diupdate',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $category = Category::where('tenant_id', $request->tenant_id)->findOrFail($id);

        if ($category->products()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori tidak bisa dihapus karena masih memiliki produk',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Kategori berhasil dihapus',
        ]);
    }
}
