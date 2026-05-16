<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('stock')->default(0)->after('min_stock');
        });

        DB::table('products')
            ->whereRaw('(SELECT COUNT(*) FROM product_variants WHERE product_variants.product_id = products.id) = 0')
            ->update(['stock' => 0]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('stock');
        });
    }
};
