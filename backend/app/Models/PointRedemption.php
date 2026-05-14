<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PointRedemption extends Model
{
    protected $fillable = ['tenant_id', 'customer_id', 'transaction_id', 'points_used', 'amount'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
