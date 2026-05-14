<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = ['product_id', 'name', 'sku', 'buy_price', 'sell_price', 'stock'];

    protected function casts(): array
    {
        return [
            'buy_price' => 'decimal:2',
            'sell_price' => 'decimal:2',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
