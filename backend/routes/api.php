<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\POSController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\PromotionController;
use App\Http\Controllers\Api\V1\PurchaseOrderController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\StockMutationController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\RoleController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/company', [AuthController::class, 'company']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Settings (auth + tenant only, no branch filter)
    Route::middleware(['tenant'])->group(function () {
        Route::get('/settings/profile', [SettingsController::class, 'profile']);
        Route::put('/settings/profile', [SettingsController::class, 'updateProfile']);
        Route::put('/settings/password', [SettingsController::class, 'changePassword']);
        
        // These settings routes might need 'settings.company' or 'settings.access'
        Route::middleware('permission:settings.company')->group(function() {
            Route::get('/settings/company', [SettingsController::class, 'company']);
            Route::put('/settings/company', [SettingsController::class, 'updateCompany']);
            Route::post('/settings/avatar', [SettingsController::class, 'uploadAvatar']);
            Route::post('/settings/logo', [SettingsController::class, 'uploadLogo']);
            Route::post('/settings/favicon', [SettingsController::class, 'uploadFavicon']);
        });

        Route::middleware('permission:settings.roles')->group(function() {
            Route::get('/settings/permissions', [RoleController::class, 'permissions']);
            Route::apiResource('roles', RoleController::class);
            Route::put('/roles/{role}/permissions', [RoleController::class, 'syncPermissions']);
        });
    });

    Route::middleware(['tenant', 'branch'])->group(function () {

        // Dashboard
        Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->middleware('permission:dashboard.view');

        // POS
        Route::prefix('pos')->group(function () {
            Route::middleware('permission:pos.access')->group(function () {
                Route::post('/checkout', [POSController::class, 'checkout']);
                Route::post('/{id}/void', [POSController::class, 'void']);
                Route::post('/hold', [POSController::class, 'hold']);
                Route::get('/holds', [POSController::class, 'holds']);
                Route::delete('/hold/{id}', [POSController::class, 'resume']);
            });
            Route::middleware('permission:pos.history')->group(function () {
                Route::get('/history', [POSController::class, 'history']);
                Route::get('/history/export', [POSController::class, 'export'])->name('pos.history.export');
                Route::get('/history/{id}', [POSController::class, 'show']);
            });
        });

        // Products
        Route::middleware('permission:products.view')->group(function() {
            Route::get('products/stats', [ProductController::class, 'stats']);
            Route::get('products', [ProductController::class, 'index']);
            Route::get('products/{product}', [ProductController::class, 'show']);
        });
        Route::post('products', [ProductController::class, 'store'])->middleware('permission:products.create');
        Route::put('products/{product}', [ProductController::class, 'update'])->middleware('permission:products.edit');
        Route::delete('products/{product}', [ProductController::class, 'destroy'])->middleware('permission:products.delete');

        // Units
        Route::get('/units', [UnitController::class, 'index'])->middleware('permission:products.view');
        Route::middleware('permission:units.manage')->group(function() {
            Route::post('/units', [UnitController::class, 'store']);
            Route::put('/units/{unit}', [UnitController::class, 'update']);
            Route::delete('/units/{unit}', [UnitController::class, 'destroy']);
        });

        // Categories
        Route::get('categories', [CategoryController::class, 'index'])->middleware('permission:categories.view');
        Route::middleware('permission:categories.manage')->group(function() {
            Route::post('categories', [CategoryController::class, 'store']);
            Route::put('categories/{category}', [CategoryController::class, 'update']);
            Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
        });

        // Customers
        Route::middleware('permission:customers.view')->group(function() {
            Route::get('customers/stats', [CustomerController::class, 'stats']);
            Route::get('customers', [CustomerController::class, 'index']);
            Route::get('customers/{customer}', [CustomerController::class, 'show']);
        });
        Route::post('customers', [CustomerController::class, 'store'])->middleware('permission:customers.create');
        Route::put('customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:customers.edit');
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:customers.delete');

        // Suppliers
        Route::middleware('permission:suppliers.view')->group(function() {
            Route::get('suppliers', [SupplierController::class, 'index']);
            Route::get('suppliers/stats', [SupplierController::class, 'stats']);
            Route::get('suppliers/{supplier}', [SupplierController::class, 'show']);
        });
        Route::middleware('permission:suppliers.manage')->group(function() {
            Route::post('suppliers', [SupplierController::class, 'store']);
            Route::put('suppliers/{supplier}', [SupplierController::class, 'update']);
            Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy']);
        });

        // Stock
        Route::prefix('stock')->group(function () {
            Route::get('/mutations', [StockMutationController::class, 'index'])->middleware('permission:stock.view');
            Route::post('/adjust', [StockMutationController::class, 'adjust'])->middleware('permission:stock.adjustments');
        });

        // Purchase Orders
        Route::prefix('purchase-orders')->group(function () {
            Route::middleware('permission:purchase_orders.view')->group(function() {
                Route::get('/', [PurchaseOrderController::class, 'index']);
                Route::get('/{id}', [PurchaseOrderController::class, 'show']);
            });
            Route::middleware('permission:purchase_orders.create')->group(function() {
                Route::post('/', [PurchaseOrderController::class, 'store']);
            });
            Route::middleware('permission:purchase_orders.edit')->group(function() {
                Route::post('/{id}/send', [PurchaseOrderController::class, 'send']);
                Route::post('/{id}/receive', [PurchaseOrderController::class, 'receive']);
            });
        });

        // Promotions
        Route::middleware('permission:settings.promotions')->group(function() {
            Route::get('promotions/active', [PromotionController::class, 'active']);
            Route::apiResource('promotions', PromotionController::class);
        });

        // Reports
        Route::prefix('reports')->middleware('permission:reports.view')->group(function () {
            Route::get('/sales', [ReportController::class, 'sales']);
            Route::get('/profit-loss', [ReportController::class, 'profitLoss']);
            Route::get('/top-products', [ReportController::class, 'topProducts']);
            Route::get('/stock', [ReportController::class, 'stock']);
            Route::get('/transactions', [ReportController::class, 'transactions']);
        });

        // Management
        Route::middleware('permission:settings.branches')->group(function() {
            Route::apiResource('branches', BranchController::class);
        });
Route::middleware('permission:settings.users')->group(function() {
    Route::get('users/{user}/activities', [UserController::class, 'activities']);
    Route::apiResource('users', UserController::class);
});
    });
});
