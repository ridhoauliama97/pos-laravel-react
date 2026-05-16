<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'tenant_id', 'category_id', 'unit_id', 'name', 'sku',
        'barcode', 'buy_price', 'sell_price', 'min_stock', 'stock', 'is_active', 'image',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'buy_price' => 'decimal:2',
            'sell_price' => 'decimal:2',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function stockMutations()
    {
        return $this->hasMany(StockMutation::class);
    }
}
