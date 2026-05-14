<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BranchMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        $branchId = $request->route('branch_id')
            ?? $request->header('X-Branch-ID')
            ?? $user->branch_id;

        if ($user->role !== 'super_admin') {
            if (!$branchId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Branch ID diperlukan',
                ], 400);
            }

            if ($user->branch_id !== null && (int)$branchId !== (int)$user->branch_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak ke cabang lain',
                ], 403);
            }
        }

        if ($branchId) {
            $request->merge(['branch_id' => (int)$branchId]);
            $request->attributes->set('branch_id', (int)$branchId);
        }

        return $next($request);
    }
}
