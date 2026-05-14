<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::where('tenant_id', $request->tenant_id);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('is_member')) {
            $query->where('is_member', $request->boolean('is_member'));
        }

        $customers = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $customers->items(),
            'message' => 'Daftar pelanggan',
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function store(CustomerRequest $request)
    {
        $customer = Customer::create([
            'tenant_id' => $request->tenant_id,
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'is_active' => $request->is_active ?? true,
            'is_member' => $request->is_member ?? false,
        ]);

        return response()->json([
            'success' => true,
            'data' => $customer,
            'message' => 'Pelanggan berhasil ditambahkan',
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $customer = Customer::with('transactions')
            ->where('tenant_id', $request->tenant_id)
            ->findOrFail($id);

        $customer->total_spent = $customer->transactions()
            ->where('status', 'completed')
            ->sum('grand_total');

        return response()->json([
            'success' => true,
            'data' => $customer,
            'message' => 'Detail pelanggan',
        ]);
    }

    public function update(CustomerRequest $request, $id)
    {
        $customer = Customer::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $customer->update($request->only(['name', 'phone', 'email', 'address', 'is_active', 'is_member']));

        return response()->json([
            'success' => true,
            'data' => $customer,
            'message' => 'Pelanggan berhasil diupdate',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $customer = Customer::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $customer->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Pelanggan berhasil dihapus',
        ]);
    }

    public function stats(Request $request)
    {
        $query = Customer::where('tenant_id', $request->tenant_id);

        $total = (clone $query)->count();
        $active = (clone $query)->where('is_active', true)->count();
        $member = (clone $query)->where('is_member', true)->count();

        $hasTransactions = (clone $query)
            ->whereHas('transactions', function ($q) {
                $q->where('status', 'completed');
            })->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'member' => $member,
                'has_transactions' => $hasTransactions,
            ],
            'message' => 'Statistik pelanggan',
        ]);
    }
}
