<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index(Request $request)
    {
        $units = Unit::latest()->get();

        return response()->json([
            'success' => true,
            'data' => $units,
            'message' => 'Daftar unit',
        ]);
    }
}
