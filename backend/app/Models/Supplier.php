<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['tenant_id', 'name', 'phone', 'email', 'address', 'opening_balance', 'is_active'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }
}
