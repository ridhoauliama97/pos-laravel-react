<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockTransfer extends Model
{
    protected $fillable = [
        'tenant_id', 'product_id', 'product_variant_id',
        'from_branch_id', 'to_branch_id', 'requested_by',
        'approved_by', 'received_by', 'qty', 'status',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function fromBranch()
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch()
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
