<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransactionItem extends Model
{
    protected $fillable = [
        'transaction_id', 'product_id', 'product_variant_id',
        'product_name', 'variant_name', 'price', 'buy_price',
        'qty', 'discount', 'subtotal',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
