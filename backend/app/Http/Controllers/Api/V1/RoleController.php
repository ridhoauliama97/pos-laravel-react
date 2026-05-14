<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $roles = Role::where('tenant_id', $request->tenant_id)
            ->with('permissions')
            ->orderBy('is_system', 'desc')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
            'message' => 'Daftar role',
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name,NULL,id,tenant_id,' . $request->tenant_id,
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $validated['tenant_id'] = $request->tenant_id;

        $role = Role::create($validated);

        return response()->json([
            'success' => true,
            'data' => $role->load('permissions'),
            'message' => 'Role berhasil dibuat',
        ]);
    }

    public function show(Request $request, Role $role)
    {
        if ($role->tenant_id !== $request->tenant_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $role->load('permissions'),
            'message' => 'Detail role',
        ]);
    }

    public function update(Request $request, Role $role)
    {
        if ($role->tenant_id !== $request->tenant_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name,' . $role->id . ',id,tenant_id,' . $request->tenant_id,
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        $role->update($validated);

        return response()->json([
            'success' => true,
            'data' => $role->fresh()->load('permissions'),
            'message' => 'Role berhasil diperbarui',
        ]);
    }

    public function destroy(Request $request, Role $role)
    {
        if ($role->tenant_id !== $request->tenant_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        if ($role->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'System role tidak dapat dihapus',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Role berhasil dihapus',
        ]);
    }

    public function permissions(Request $request)
    {
        $permissions = Permission::orderBy('group')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $permissions,
            'message' => 'Daftar permission',
        ]);
    }

    public function syncPermissions(Request $request, Role $role)
    {
        if ($role->tenant_id !== $request->tenant_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'permission_ids' => 'present|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role->permissions()->sync($validated['permission_ids']);

        return response()->json([
            'success' => true,
            'data' => $role->fresh()->load('permissions'),
            'message' => 'Permission berhasil diperbarui',
        ]);
    }
}
