<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserActivityLog extends Model
{
    protected $fillable = ['tenant_id', 'user_id', 'action', 'description', 'ip_address'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
