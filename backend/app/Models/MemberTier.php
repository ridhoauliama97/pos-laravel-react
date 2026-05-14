<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MemberTier extends Model
{
    protected $fillable = ['tenant_id', 'name', 'min_spent', 'discount_percent', 'point_multiplier'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
