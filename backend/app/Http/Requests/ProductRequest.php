<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'unit_id' => 'nullable|exists:units,id',
            'sku' => 'nullable|string|max:50|unique:products,sku,' . $this->route('product'),
            'barcode' => 'nullable|string|max:50',
            'buy_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'min_stock' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'image' => 'nullable',
            'variants' => 'nullable|array',
            'variants.*.name' => 'required_with:variants|string',
            'variants.*.sku' => 'nullable|string',
            'variants.*.buy_price' => 'nullable|numeric|min:0',
            'variants.*.sell_price' => 'nullable|numeric|min:0',
            'variants.*.stock' => 'nullable|integer|min:0',
        ];
    }
}
