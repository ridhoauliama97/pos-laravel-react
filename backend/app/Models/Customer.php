<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = ['tenant_id', 'name', 'phone', 'email', 'address', 'is_active', 'is_member', 'points', 'member_tier'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_member' => 'boolean',
            'points' => 'integer',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
