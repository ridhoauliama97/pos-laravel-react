<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('branch')
            ->where('tenant_id', $request->tenant_id);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->role) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'message' => 'Daftar user',
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = User::with('branch')
            ->where('tenant_id', $request->tenant_id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $user,
            'message' => 'Detail user',
        ]);
    }

    public function store(UserRequest $request)
    {
        $user = User::create([
            'tenant_id' => $request->tenant_id,
            'branch_id' => $request->branch_id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $request->role,
            'is_active' => $request->is_active ?? true,
        ]);

        UserActivityLog::create([
            'tenant_id' => $request->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'create_user',
            'description' => 'Membuat user ' . $user->name . ' (' . $user->email . ') dengan role ' . $user->role,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $user->load('branch'),
            'message' => 'User berhasil dibuat',
        ], 201);
    }

    public function update(UserRequest $request, $id)
    {
        $user = User::where('tenant_id', $request->tenant_id)->findOrFail($id);

        $data = $request->only(['name', 'email', 'role', 'branch_id', 'is_active']);
        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $user->update($data);

        UserActivityLog::create([
            'tenant_id' => $request->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'update_user',
            'description' => 'Mengupdate user ' . $user->name . ' (' . $user->email . ')',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $user->fresh()->load('branch'),
            'message' => 'User berhasil diupdate',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->id == (int)$id) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus akun sendiri',
            ], 422);
        }

        $user = User::where('tenant_id', $request->tenant_id)->findOrFail($id);
        $userName = $user->name;
        $userEmail = $user->email;
        $user->delete();

        UserActivityLog::create([
            'tenant_id' => $request->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'delete_user',
            'description' => 'Menghapus user ' . $userName . ' (' . $userEmail . ')',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'User berhasil dihapus',
        ]);
    }

    public function activities(Request $request, $id)
    {
        $logs = UserActivityLog::with('user')
            ->where('tenant_id', $request->tenant_id)
            ->where('user_id', $id)
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'message' => 'Aktivitas user',
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
