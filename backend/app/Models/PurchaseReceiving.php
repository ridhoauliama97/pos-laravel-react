<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseReceiving extends Model
{
    protected $fillable = [
        'tenant_id', 'branch_id', 'purchase_order_id', 'user_id', 'notes',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
