<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\BudgetLine;
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

        // Actuals per category for the current month
        if ($currentMonthBudget) {
            $actuals = $currentTeam->transactions()
                ->whereYear('transacted_at', $currentMonth->year)
                ->whereMonth('transacted_at', $currentMonth->month)
                ->whereNotNull('category_id')
                ->selectRaw('category_id, SUM(amount_cents) as total_cents')
                ->groupBy('category_id')
                ->pluck('total_cents', 'category_id')
                ->map(fn (mixed $total): int => is_numeric($total) ? (int) $total : 0);

            $currentMonthBudget->setRelation(
                'lines',
                $currentMonthBudget->lines->map(fn (BudgetLine $line) => tap($line, function (BudgetLine $line) use ($actuals): void {
                    $line->actual_cents = $actuals->get($line->category_id, 0);
                })),
            );
        }

        $recentTransactions = $currentTeam->transactions()
            ->with('category:id,name,color')
            ->orderByDesc('transacted_at')
            ->orderByDesc('id')
            ->limit(8)
            ->get(['id', 'description', 'amount_cents', 'transacted_at', 'category_id']);

        $recentBudgets = Budget::where('team_id', $currentTeam->id)
            ->whereDate('month', '!=', $currentMonth)
            ->orderByDesc('month')
            ->limit(5)
            ->get(['id', 'month', 'notes']);

        return Inertia::render('dashboard', [
            'currentMonthBudget' => $currentMonthBudget ? array_merge($currentMonthBudget->toArray(), [
                'lines' => $currentMonthBudget->lines->map(fn (BudgetLine $line) => array_merge($line->toArray(), [
                    'actual_cents' => $line->actual_cents ?? 0,
                ])),
            ]) : null,
            'recentTransactions' => $recentTransactions,
            'recentBudgets' => $recentBudgets,
        ]);
    }
}
