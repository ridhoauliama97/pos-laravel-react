<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'tenant_id', 'branch_id', 'user_id', 'customer_id', 'invoice_no',
        'subtotal', 'discount_total', 'tax_total', 'grand_total',
        'payment_method', 'payment_amount', 'change_amount', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'payment_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }
}
