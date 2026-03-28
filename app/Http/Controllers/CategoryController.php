<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Team $currentTeam */
        $currentTeam = $user->currentTeam;

        $categories = Category::where('team_id', $currentTeam->id)
            ->orderBy('is_income')
            ->orderBy('name')
            ->get();

        return Inertia::render('categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_income' => ['boolean'],
        ]);

        /** @var User $user */
        $user = $request->user();

        /** @var Team $currentTeam */
        $currentTeam = $user->currentTeam;

        $currentTeam->categories()->create($validated);

        return back();
    }

    public function update(Request $request, Team $currentTeam, Category $category): RedirectResponse
    {
        Gate::authorize('update', $category);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_income' => ['boolean'],
        ]);

        $category->update($validated);

        return back();
    }

    public function destroy(Team $currentTeam, Category $category): RedirectResponse
    {
        Gate::authorize('delete', $category);

        $category->delete();

        return back();
    }
}
