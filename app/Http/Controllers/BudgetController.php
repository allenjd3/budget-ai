<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function index(Team $currentTeam): Response
    {
        $budgets = Budget::where('team_id', $currentTeam->id)
            ->withCount('lines')
            ->withSum('lines', 'allocated_cents')
            ->orderByDesc('month')
            ->get();

        // Actual spending per month-key (one query, no N+1)
        $actuals = $currentTeam->transactions()
            ->selectRaw("strftime('%Y-%m', transacted_at) as month_key, SUM(amount_cents) as total_cents")
            ->groupByRaw("strftime('%Y-%m', transacted_at)")
            ->pluck('total_cents', 'month_key')
            ->map(fn (mixed $v): int => is_numeric($v) ? (int) $v : 0);

        $budgets->each(function (Budget $budget) use ($actuals): void {
            $budget->actual_cents = $actuals->get($budget->month->format('Y-m'), 0);
        });

        return Inertia::render('budgets/index', [
            'budgets' => $budgets,
        ]);
    }

    public function create(Team $currentTeam): Response
    {
        $previousBudget = Budget::where('team_id', $currentTeam->id)
            ->orderByDesc('month')
            ->first(['id', 'month']);

        return Inertia::render('budgets/create', [
            'previousBudget' => $previousBudget,
        ]);
    }

    public function store(Request $request, Team $currentTeam): RedirectResponse
    {
        $validated = $request->validate([
            'month' => [
                'required',
                'date',
                Rule::unique('budgets', 'month')->where('team_id', $currentTeam->id),
            ],
            'notes' => ['nullable', 'string'],
            'copy_from_budget_id' => [
                'nullable',
                Rule::exists('budgets', 'id')->where('team_id', $currentTeam->id),
            ],
        ]);

        $validated['month'] = substr($validated['month'], 0, 7).'-01';

        $budget = $currentTeam->budgets()->create($validated);

        // Build allocation map from the source budget if requested
        $sourceAllocations = collect();
        if (! empty($validated['copy_from_budget_id'])) {
            $sourceBudget = Budget::find((int) $validated['copy_from_budget_id']);
            if ($sourceBudget) {
                $sourceAllocations = $sourceBudget->lines()
                    ->pluck('allocated_cents', 'category_id');
            }
        }

        $currentTeam->categories()
            ->orderBy('is_income')
            ->orderBy('name')
            ->get(['id'])
            ->each(fn ($category) => $budget->lines()->create([
                'category_id' => $category->id,
                'allocated_cents' => $sourceAllocations->get($category->id, 0),
            ]));

        return redirect()->route('teams.budgets.show', [
            'current_team' => $currentTeam,
            'budget' => $budget,
        ]);
    }

    public function show(Team $currentTeam, Budget $budget): Response
    {
        Gate::authorize('view', $budget);

        $budget->load(['lines.category']);

        $actuals = $currentTeam->transactions()
            ->whereYear('transacted_at', $budget->month->year)
            ->whereMonth('transacted_at', $budget->month->month)
            ->whereNotNull('category_id')
            ->selectRaw('category_id, SUM(amount_cents) as total_cents')
            ->groupBy('category_id')
            ->pluck('total_cents', 'category_id')
            ->map(fn (mixed $total): int => is_numeric($total) ? (int) $total : 0);

        $usedCategoryIds = $budget->lines->pluck('category_id');

        $availableCategories = $currentTeam->categories()
            ->whereNotIn('id', $usedCategoryIds)
            ->orderBy('is_income')
            ->orderBy('name')
            ->get(['id', 'name', 'is_income']);

        return Inertia::render('budgets/show', [
            'budget' => array_merge($budget->toArray(), [
                'lines' => $budget->lines->map(fn (BudgetLine $line) => array_merge($line->toArray(), [
                    'actual_cents' => $actuals->get($line->category_id, 0),
                ])),
            ]),
            'availableCategories' => $availableCategories,
        ]);
    }

    public function update(Request $request, Team $currentTeam, Budget $budget): RedirectResponse
    {
        Gate::authorize('update', $budget);

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
            'total_cents' => ['nullable', 'integer'],
        ]);

        $budget->update($validated);

        return back();
    }
}
