<?php

namespace App\Jobs;

use App\Models\Customer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class UpdateCustomerPoints implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $transactionId,
        public int $customerId,
        public int $grandTotal,
        public ?int $tenantId = null,
    ) {}

    public function handle(): void
    {
        $customer = Customer::where('id', $this->customerId);
        if ($this->tenantId) {
            $customer->where('tenant_id', $this->tenantId);
        }
        $customer = $customer->first();

        if (!$customer || !$customer->is_member) {
            return;
        }

        $points = (int)($this->grandTotal * 0.02);

        $customer->increment('points', $points);
    }
}
