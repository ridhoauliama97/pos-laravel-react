<?php

namespace App\Providers;

use App\Jobs\UpdateCustomerPoints;
use App\Models\Transaction;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Event::listen('transaction.completed', function (Transaction $transaction) {
            if ($transaction->customer_id) {
                UpdateCustomerPoints::dispatch(
                    $transaction->id,
                    $transaction->customer_id,
                    $transaction->grand_total,
                    $transaction->tenant_id,
                )->onQueue('low');
            }
        });
    }
}
