<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::with(['tenant', 'branch', 'role_model.permissions'])->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun anda dinonaktifkan',
            ], 403);
        }

        $token = $user->createToken('pos-token')->plainTextToken;

        $user->permissions = $user->role_model ? $user->role_model->permissions->pluck('name') : [];

        UserActivityLog::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'action' => 'login',
            'description' => 'Login ke sistem',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
            'message' => 'Login berhasil',
        ]);
    }

    public function logout(Request $request)
    {
        UserActivityLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'logout',
            'description' => 'Logout dari sistem',
            'ip_address' => $request->ip(),
        ]);

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Logout berhasil',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['tenant', 'branch', 'role_model.permissions']);

        $user->permissions = $user->role_model ? $user->role_model->permissions->pluck('name') : [];

        return response()->json([
            'success' => true,
            'data' => $user,
            'message' => 'Data user',
        ]);
    }
}
