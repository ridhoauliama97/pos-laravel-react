<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('currency')->default('IDR');
            $table->string('currency_symbol')->default('Rp');
            $table->string('language')->default('id');
            $table->string('timezone')->default('Asia/Jakarta');
            $table->string('date_format')->default('d/m/Y');
            $table->string('logo')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('avatar')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['currency', 'currency_symbol', 'language', 'timezone', 'date_format', 'logo']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'address', 'avatar']);
        });
    }
};
