<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Super admin bypass
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // Fetch user permissions via role_model relationship
        $permissions = $user->role_model && $user->role_model->permissions 
            ? $user->role_model->permissions->pluck('name')->toArray() 
            : [];

        if (in_array($permission, $permissions)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Akses ditolak: Anda tidak memiliki izin (' . $permission . ')',
        ], 403);
    }
}
