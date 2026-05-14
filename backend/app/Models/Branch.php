<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['tenant_id', 'name', 'address', 'phone', 'status'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function stockMutations()
    {
        return $this->hasMany(StockMutation::class);
    }
}
