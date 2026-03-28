<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Team;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request, Team $currentTeam): Response
    {
        $query = Transaction::where('team_id', $currentTeam->id)
            ->with('category')
            ->orderByDesc('transacted_at')
            ->orderByDesc('id');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('budget_id')) {
            $budget = Budget::where('team_id', $currentTeam->id)
                ->find($request->integer('budget_id'));

            if ($budget) {
                $query->whereYear('transacted_at', $budget->month->year)
                    ->whereMonth('transacted_at', $budget->month->month);
            }
        }

        return Inertia::render('transactions/index', [
            'transactions' => $query->paginate(50)->withQueryString(),
            'categories' => $currentTeam->categories()->orderBy('name')->get(['id', 'name', 'is_income', 'color']),
            'budgets' => Budget::where('team_id', $currentTeam->id)
                ->orderByDesc('month')
                ->get(['id', 'month']),
            'filters' => $request->only('category_id', 'budget_id'),
        ]);
    }

    public function create(Team $currentTeam): Response
    {
        return Inertia::render('transactions/create', [
            'categories' => $currentTeam->categories()->orderBy('is_income')->orderBy('name')->get(['id', 'name', 'is_income']),
        ]);
    }

    public function store(Request $request, Team $currentTeam): RedirectResponse
    {
        $validated = $request->validate([
            'transacted_at' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer'],
            'category_id' => [
                'nullable',
                Rule::exists('categories', 'id')->where('team_id', $currentTeam->id),
            ],
            'notes' => ['nullable', 'string'],
        ]);

        $validated['categorized_by'] = 'user';

        $currentTeam->transactions()->create($validated);

        return redirect()->route('teams.transactions.index', ['current_team' => $currentTeam]);
    }

    public function edit(Team $currentTeam, Transaction $transaction): Response
    {
        Gate::authorize('update', $transaction);

        return Inertia::render('transactions/edit', [
            'transaction' => $transaction->load('category'),
            'categories' => $currentTeam->categories()->orderBy('is_income')->orderBy('name')->get(['id', 'name', 'is_income']),
        ]);
    }

    public function update(Request $request, Team $currentTeam, Transaction $transaction): RedirectResponse
    {
        Gate::authorize('update', $transaction);

        $validated = $request->validate([
            'transacted_at' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer'],
            'category_id' => [
                'nullable',
                Rule::exists('categories', 'id')->where('team_id', $currentTeam->id),
            ],
            'notes' => ['nullable', 'string'],
        ]);

        $transaction->update($validated);

        return redirect()->route('teams.transactions.index', ['current_team' => $currentTeam]);
    }

    public function destroy(Team $currentTeam, Transaction $transaction): RedirectResponse
    {
        Gate::authorize('delete', $transaction);

        $transaction->delete();

        return redirect()->route('teams.transactions.index', ['current_team' => $currentTeam]);
    }
}
