<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\StockMutation;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

class POSService
{
    public function processCheckout(array $data, int $branchId, int $userId, int $tenantId): Transaction
    {
        return DB::transaction(function () use ($data, $branchId, $userId, $tenantId) {
            $invoiceNo = 'INV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            $subtotal = 0;
            $totalDiscount = 0;
            $items = [];

            foreach ($data['items'] as $item) {
                $product = Product::where('id', $item['product_id'])
                    ->where('tenant_id', $tenantId)
                    ->firstOrFail();

                $buyPrice = $product->buy_price;
                $sellPrice = $product->sell_price;
                $variantName = null;

                if (!empty($item['product_variant_id'])) {
                    $variant = ProductVariant::where('id', $item['product_variant_id'])
                        ->whereHas('product', fn($q) => $q->where('tenant_id', $tenantId))
                        ->firstOrFail();
                    $buyPrice = $variant->buy_price ?: $product->buy_price;
                    $sellPrice = $variant->sell_price ?: $product->sell_price;
                    $variantName = $variant->name;

                    $stockBefore = $variant->stock;
                    $variant->decrement('stock', $item['qty']);
                    $stockAfter = $variant->fresh()->stock;
                }

                $itemSubtotal = $sellPrice * $item['qty'];
                $itemDiscount = $item['discount'] ?? 0;
                $itemTotal = $itemSubtotal - $itemDiscount;

                $subtotal += $itemSubtotal;
                $totalDiscount += $itemDiscount;

                $items[] = [
                    'product_id' => $product->id,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'product_name' => $product->name,
                    'variant_name' => $variantName,
                    'price' => $sellPrice,
                    'buy_price' => $buyPrice,
                    'qty' => $item['qty'],
                    'discount' => $itemDiscount,
                    'subtotal' => $itemTotal,
                ];

                StockMutation::create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branchId,
                    'product_id' => $product->id,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'user_id' => $userId,
                    'type' => 'out',
                    'reference_type' => 'sale',
                    'qty' => $item['qty'],
                    'stock_before' => $stockBefore ?? 0,
                    'stock_after' => $stockAfter ?? 0,
                    'note' => 'Penjualan ' . $invoiceNo,
                ]);
            }

            $grandTotal = $subtotal - $totalDiscount;

            if (($data['payment_amount'] ?? $grandTotal) < $grandTotal) {
                throw new \InvalidArgumentException('Jumlah pembayaran kurang dari total belanja');
            }

            $transaction = Transaction::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'user_id' => $userId,
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_no' => $invoiceNo,
                'subtotal' => $subtotal,
                'discount_total' => $totalDiscount,
                'tax_total' => 0,
                'grand_total' => $grandTotal,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'payment_amount' => $data['payment_amount'] ?? $grandTotal,
                'change_amount' => ($data['payment_amount'] ?? $grandTotal) - $grandTotal,
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                $transaction->items()->create($item);
            }

            if (!empty($data['customer_id'])) {
                Event::dispatch('transaction.completed', $transaction);
            }

            return $transaction->load('items');
        });
    }

    public function voidTransaction(Transaction $transaction): Transaction
    {
        return DB::transaction(function () use ($transaction) {
            $transaction->update(['status' => 'void']);

            foreach ($transaction->items as $item) {
                if ($item->product_variant_id) {
                    $variant = ProductVariant::where('id', $item->product_variant_id)->first();
                    if ($variant) {
                        $stockBefore = $variant->stock;
                        $variant->increment('stock', $item->qty);
                        $stockAfter = $variant->fresh()->stock;
                    }
                }

                StockMutation::create([
                    'tenant_id' => $transaction->tenant_id,
                    'branch_id' => $transaction->branch_id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'user_id' => $transaction->user_id,
                    'type' => 'in',
                    'reference_type' => 'void',
                    'reference_id' => $transaction->id,
                    'qty' => $item->qty,
                    'stock_before' => $stockBefore ?? 0,
                    'stock_after' => $stockAfter ?? 0,
                    'note' => 'Void transaksi ' . $transaction->invoice_no,
                ]);
            }

            if ($transaction->customer_id) {
                $customer = \App\Models\Customer::where('id', $transaction->customer_id)->first();
                if ($customer && $customer->is_member) {
                    $refundPoints = (int)($transaction->grand_total * 0.02);
                    $customer->decrement('points', min($refundPoints, $customer->points));
                }
            }

            return $transaction;
        });
    }
}
