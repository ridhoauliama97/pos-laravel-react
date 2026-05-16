<?php

use App\Models\PurchaseOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        PurchaseOrder::whereNotNull('supplier_id')
            ->each(fn($po) => $po->suppliers()->syncWithoutDetaching([$po->supplier_id]));
    }

    public function down(): void
    {
        // No rollback — data migration only
    }
};
