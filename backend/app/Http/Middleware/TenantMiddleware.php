<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->route('tenant_id')
            ?? $request->header('X-Tenant-ID')
            ?? $request->user()?->tenant_id;

        if (!$tenantId) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant ID diperlukan',
            ], 400);
        }

        $request->merge(['tenant_id' => $tenantId]);
        $request->attributes->set('tenant_id', $tenantId);

        return $next($request);
    }
}
