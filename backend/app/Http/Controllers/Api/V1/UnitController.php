<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index(Request $request)
    {
        $units = Unit::where('tenant_id', $request->tenant_id)->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $units,
            'message' => 'Daftar unit',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'short' => 'nullable|string|max:50',
        ]);

        $data['tenant_id'] = $request->tenant_id;
        $unit = Unit::create($data);

        return response()->json([
            'success' => true,
            'data' => $unit,
            'message' => 'Unit berhasil dibuat',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $unit = Unit::where('tenant_id', $request->tenant_id)->findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'short' => 'nullable|string|max:50',
        ]);

        $unit->update($data);

        return response()->json([
            'success' => true,
            'data' => $unit,
            'message' => 'Unit berhasil diupdate',
        ]);
    }

    public function destroy($id)
    {
        $unit = Unit::where('tenant_id', request()->tenant_id)->findOrFail($id);

        if ($unit->products()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Unit tidak bisa dihapus karena masih memiliki produk',
            ], 422);
        }

        $unit->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Unit berhasil dihapus',
        ]);
    }
}
