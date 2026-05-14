<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->input('tenant_id') ?? $this->user()?->tenant_id;

        return [
            'supplier_id' => [
                'nullable',
                Rule::exists('suppliers', 'id')->where('tenant_id', $tenantId),
            ],
            'items' => 'required|array|min:1',
            'items.*.product_id' => [
                'required',
                Rule::exists('products', 'id')->where('tenant_id', $tenantId),
            ],
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ];
    }
}
