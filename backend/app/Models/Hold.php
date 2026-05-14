<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hold extends Model
{
    protected $fillable = ['tenant_id', 'branch_id', 'user_id', 'items', 'total'];

    protected function casts(): array
    {
        return [
            'items' => 'array',
            'total' => 'decimal:2',
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
}
