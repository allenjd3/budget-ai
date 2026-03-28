<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::inertia('{current_team}/dashboard', 'dashboard')->name('dashboard');
        Route::resource('teams.categories', CategoryController::class)
            ->parameters([
                'teams' => 'current_team',
            ])
            ->only(['index', 'store', 'update', 'destroy']);
    });

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
});

require __DIR__.'/settings.php';
