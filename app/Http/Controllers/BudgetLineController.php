<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class BudgetLineController extends Controller
{
    public function store(Request $request, Team $currentTeam, Budget $budget): RedirectResponse
    {
        Gate::authorize('update', $budget);

        $validated = $request->validate([
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('team_id', $currentTeam->id),
                Rule::unique('budget_lines', 'category_id')->where('budget_id', $budget->id),
            ],
            'allocated_cents' => ['required', 'integer', 'min:0'],
        ]);

        $budget->lines()->create($validated);

        return back();
    }

    public function update(Request $request, Team $currentTeam, Budget $budget, BudgetLine $line): RedirectResponse
    {
        Gate::authorize('update', $line);

        $validated = $request->validate([
            'allocated_cents' => ['required', 'integer', 'min:0'],
        ]);

        $line->update($validated);

        return back();
    }

    public function destroy(Team $currentTeam, Budget $budget, BudgetLine $line): RedirectResponse
    {
        Gate::authorize('delete', $line);

        $line->delete();

        return back();
    }
}
