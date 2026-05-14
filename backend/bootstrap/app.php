<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\TenantMiddleware;
use App\Http\Middleware\BranchMiddleware;
use App\Http\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'tenant' => TenantMiddleware::class,
            'branch' => BranchMiddleware::class,
            'role' => RoleMiddleware::class,
            'permission' => \App\Http\Middleware\PermissionMiddleware::class,
        ]);

        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                $status = $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException
                    ? $e->getStatusCode()
                    : ($e instanceof \Illuminate\Validation\ValidationException ? 422 : 500);

                $message = $e->getMessage() ?: 'Terjadi kesalahan server';

                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validasi gagal',
                        'errors' => $e->errors(),
                    ], 422);
                }

                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthenticated',
                    ], 401);
                }

                if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Resource tidak ditemukan',
                    ], 404);
                }

                if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Data tidak ditemukan',
                    ], 404);
                }

                if (!($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException)) {
                    $message = 'Terjadi kesalahan server internal';
                }

                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], $status);
            }
        });
    })->create();
