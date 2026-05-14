<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'category_id', 'type', 'value', 'min_purchase',
        'start_date', 'end_date', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'start_date' => 'date',
            'end_date' => 'date',
            'value' => 'decimal:2',
            'min_purchase' => 'decimal:2',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function items()
    {
        return $this->hasMany(PromotionItem::class);
    }
}
