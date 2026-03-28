<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Team;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Team $currentTeam): Response
    {
        $currentMonth = Carbon::now()->startOfMonth();

        $currentMonthBudget = Budget::where('team_id', $currentTeam->id)
            ->whereDate('month', $currentMonth)
            ->with('lines.category')
            ->first();

        $recentBudgets = Budget::where('team_id', $currentTeam->id)
            ->orderByDesc('month')
            ->limit(6)
            ->get(['id', 'month', 'notes']);

        return Inertia::render('dashboard', [
            'currentMonthBudget' => $currentMonthBudget,
            'recentBudgets' => $recentBudgets,
        ]);
    }
}
