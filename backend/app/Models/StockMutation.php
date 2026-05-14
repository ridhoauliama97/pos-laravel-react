<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMutation extends Model
{
    protected $fillable = [
        'tenant_id', 'branch_id', 'product_id', 'product_variant_id',
        'user_id', 'type', 'reference_type', 'reference_id',
        'qty', 'stock_before', 'stock_after', 'note',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
