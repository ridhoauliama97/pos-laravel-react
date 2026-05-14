<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['tenant_id', 'name', 'display_name', 'description', 'is_system'];

    public function permissions()
    {
        return $this->belongsToMany(Permission::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
