<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = ['name', 'domain', 'status', 'currency', 'currency_symbol', 'language', 'timezone', 'date_format', 'logo', 'favicon'];

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    public function suppliers()
    {
        return $this->hasMany(Supplier::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
