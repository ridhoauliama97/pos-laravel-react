<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function profile(Request $request)
    {
        $user = $request->user()->load('tenant');

        return response()->json([
            'success' => true,
            'data' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address' => $user->address,
                'avatar' => $user->avatar,
                'role' => $user->role,
                'tenant' => [
                    'name' => $user->tenant->name,
                    'currency' => $user->tenant->currency,
                    'currency_symbol' => $user->tenant->currency_symbol,
                    'language' => $user->tenant->language,
                    'timezone' => $user->tenant->timezone,
                    'date_format' => $user->tenant->date_format,
                    'logo' => $user->tenant->logo,
                    'favicon' => $user->tenant->favicon,
                ],
            ],
            'message' => 'Data profil',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $request->user()->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
        ]);

        $request->user()->update($validated);

        return response()->json([
            'success' => true,
            'data' => $request->user()->fresh(),
            'message' => 'Profil berhasil diperbarui',
        ]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini tidak sesuai',
            ], 422);
        }

        $user->update(['password' => Hash::make($validated['new_password'])]);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Password berhasil diubah',
        ]);
    }

    public function company(Request $request)
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'success' => true,
            'data' => [
                'name' => $tenant->name,
                'domain' => $tenant->domain,
                'currency' => $tenant->currency,
                'currency_symbol' => $tenant->currency_symbol,
                'language' => $tenant->language,
                'timezone' => $tenant->timezone,
                'date_format' => $tenant->date_format,
                'logo' => $tenant->logo,
                'favicon' => $tenant->favicon,
            ],
            'message' => 'Data perusahaan',
        ]);
    }

    public function updateCompany(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'currency' => 'required|string|size:3',
            'currency_symbol' => 'required|string|max:5',
            'language' => 'required|string|size:2',
            'timezone' => 'required|string|max:50',
            'date_format' => 'required|string|max:20',
        ]);

        $request->user()->tenant->update($validated);

        return response()->json([
            'success' => true,
            'data' => $request->user()->tenant->fresh(),
            'message' => 'Pengaturan perusahaan diperbarui',
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $path = $request->file('avatar')->store('avatars', 'public');
        $url = Storage::url($path);

        $request->user()->update(['avatar' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['avatar' => $url],
            'message' => 'Foto profil berhasil diupload',
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $path = $request->file('logo')->store('logos', 'public');
        $url = Storage::url($path);

        $request->user()->tenant->update(['logo' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['logo' => $url],
            'message' => 'Logo berhasil diupload',
        ]);
    }

    public function uploadFavicon(Request $request)
    {
        $request->validate([
            'favicon' => 'required|file|mimes:png,jpg,jpeg,gif,webp,svg,ico|max:1024',
        ]);

        $path = $request->file('favicon')->store('favicons', 'public');
        $url = Storage::url($path);

        $request->user()->tenant->update(['favicon' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['favicon' => $url],
            'message' => 'Favicon berhasil diupload',
        ]);
    }
}
