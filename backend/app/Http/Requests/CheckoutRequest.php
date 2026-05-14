<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->input('tenant_id') ?? $this->user()?->tenant_id;

        return [
            'items' => 'required|array|min:1',
            'items.*.product_id' => [
                'required',
                Rule::exists('products', 'id')->where('tenant_id', $tenantId),
            ],
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.discount' => 'nullable|numeric|min:0',
            'customer_id' => [
                'nullable',
                Rule::exists('customers', 'id')->where('tenant_id', $tenantId),
            ],
            'payment_method' => 'required|string',
            'payment_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ];
    }
}
