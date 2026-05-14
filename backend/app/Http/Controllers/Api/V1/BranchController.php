<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function show(Request $request, $id)
    {
        $branch = Branch::withCount('users')
            ->where('tenant_id', $request->tenant_id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $branch,
            'message' => 'Detail cabang',
        ]);
    }

    public function index(Request $request)
    {
        $branches = Branch::where('tenant_id', $request->tenant_id)
            ->withCount('users')
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $branches->items(),
            'message' => 'Daftar cabang',
            'meta' => [
                'current_page' => $branches->currentPage(),
                'last_page' => $branches->lastPage(),
                'per_page' => $branches->perPage(),
                'total' => $branches->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
        ]);

        $branch = Branch::create([
            'tenant_id' => $request->tenant_id,
            ...$data,
        ]);

        return response()->json([
            'success' => true,
            'data' => $branch,
            'message' => 'Cabang berhasil ditambahkan',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $branch = Branch::where('tenant_id', $request->tenant_id)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $branch->update($data);

        return response()->json([
            'success' => true,
            'data' => $branch,
            'message' => 'Cabang berhasil diupdate',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $branch = Branch::where('tenant_id', $request->tenant_id)->findOrFail($id);

        if ($branch->users()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cabang tidak bisa dihapus karena masih memiliki user',
            ], 422);
        }

        $branch->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Cabang berhasil dihapus',
        ]);
    }
}
