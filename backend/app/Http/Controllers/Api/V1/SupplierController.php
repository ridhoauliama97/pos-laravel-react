<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::where('tenant_id', $request->tenant_id);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('phone', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $suppliers = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $suppliers->items(),
            'message' => 'Daftar supplier',
            'meta' => [
                'current_page' => $suppliers->currentPage(),
                'last_page' => $suppliers->lastPage(),
                'per_page' => $suppliers->perPage(),
                'total' => $suppliers->total(),
            ],
        ]);
    }

    public function store(SupplierRequest $request)
    {
        $supplier = Supplier::create([
            'tenant_id' => $request->tenant_id,
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'opening_balance' => $request->opening_balance ?? 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'data' => $supplier,
            'message' => 'Supplier berhasil ditambahkan',
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $supplier = Supplier::where('tenant_id', $request->tenant_id)->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $supplier,
            'message' => 'Detail supplier',
        ]);
    }

    public function update(SupplierRequest $request, $id)
    {
        $supplier = Supplier::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $supplier->update($request->only(['name', 'phone', 'email', 'address', 'opening_balance', 'is_active']));

        return response()->json([
            'success' => true,
            'data' => $supplier,
            'message' => 'Supplier berhasil diupdate',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $supplier = Supplier::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $supplier->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Supplier berhasil dihapus',
        ]);
    }

    public function stats(Request $request)
    {
        $query = Supplier::where('tenant_id', $request->tenant_id);

        $total = (clone $query)->count();
        $active = (clone $query)->where('is_active', true)->count();
        $inactive = $total - $active;
        $totalBalance = (clone $query)->sum('opening_balance');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'total_opening_balance' => $totalBalance,
            ],
            'message' => 'Statistik supplier',
        ]);
    }
}
