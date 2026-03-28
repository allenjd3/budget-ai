<?php

use App\Http\Controllers\BudgetController;
use App\Http\Controllers\BudgetLineController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\TransactionController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('teams/{current_team}/dashboard', DashboardController::class)->name('dashboard');
        Route::resource('teams.categories', CategoryController::class)
            ->parameters([
                'teams' => 'current_team',
            ])
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('teams.budgets', BudgetController::class)
            ->parameters([
                'teams' => 'current_team',
            ])
            ->only(['index', 'create', 'store', 'show', 'update']);

        Route::resource('teams.budgets.lines', BudgetLineController::class)
            ->parameters([
                'teams' => 'current_team',
            ])
            ->only(['store', 'update', 'destroy']);

        Route::resource('teams.transactions', TransactionController::class)
            ->parameters([
                'teams' => 'current_team',
            ])
            ->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);
    });

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
});

require __DIR__.'/settings.php';
