<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['tenant_id', 'name', 'slug'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
