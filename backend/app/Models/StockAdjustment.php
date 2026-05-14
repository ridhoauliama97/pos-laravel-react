<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    protected $fillable = [
        'tenant_id', 'branch_id', 'user_id', 'approved_by',
        'product_id', 'product_variant_id', 'type', 'qty', 'reason', 'status',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
