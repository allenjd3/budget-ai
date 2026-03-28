<?php

namespace App\Http\Controllers;

use App\Models\Budget;
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
            ->orderByDesc('month')
            ->get();

        return Inertia::render('budgets/index', [
            'budgets' => $budgets,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('budgets/create');
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
        ]);

        $validated['month'] = substr($validated['month'], 0, 7).'-01';

        $budget = $currentTeam->budgets()->create($validated);

        $currentTeam->categories()
            ->orderBy('is_income')
            ->orderBy('name')
            ->get(['id'])
            ->each(fn ($category) => $budget->lines()->create([
                'category_id' => $category->id,
                'allocated_cents' => 0,
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

        return Inertia::render('budgets/show', [
            'budget' => $budget,
        ]);
    }

    public function update(Request $request, Team $currentTeam, Budget $budget): RedirectResponse
    {
        Gate::authorize('update', $budget);

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $budget->update($validated);

        return back();
    }
}
