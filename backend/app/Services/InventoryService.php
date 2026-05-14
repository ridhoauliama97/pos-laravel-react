<?php

namespace App\Services;

use App\Models\StockMutation;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function adjustStock(int $tenantId, int $branchId, int $userId, int $productId, ?int $variantId, string $type, int $qty, string $note): void
    {
        DB::transaction(function () use ($tenantId, $branchId, $userId, $productId, $variantId, $type, $qty, $note) {
            $product = Product::where('id', $productId)->where('tenant_id', $tenantId)->firstOrFail();

            if ($variantId) {
                $variant = ProductVariant::findOrFail($variantId);
                $stockBefore = $variant->stock;
                $stockAfter = $type === 'in' ? $stockBefore + $qty : $stockBefore - $qty;
                $variant->update(['stock' => max(0, $stockAfter)]);
            } else {
                $stockBefore = 0;
                $stockAfter = $type === 'in' ? $qty : 0;
            }

            StockMutation::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'product_id' => $productId,
                'product_variant_id' => $variantId,
                'user_id' => $userId,
                'type' => $type,
                'reference_type' => 'adjustment',
                'qty' => $qty,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'note' => $note,
            ]);
        });
    }
}
