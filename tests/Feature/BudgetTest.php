<?php

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\Category;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DefaultCategoriesSeeder;

beforeEach(function () {
    $this->seed(DefaultCategoriesSeeder::class);
});

// --- Budget index ---

it('lists budgets for the authenticated users current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    Budget::factory()->for($team)->create(['month' => '2026-03-01']);

    $this->actingAs($user)
        ->get(route('teams.budgets.index', ['current_team' => $team]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('budgets/index')
            ->has('budgets', 1)
        );
});

it('does not show budgets from other teams', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    Budget::factory()->for($otherTeam)->create();

    $this->actingAs($user)
        ->get(route('teams.budgets.index', ['current_team' => $user->currentTeam]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('budgets/index')
            ->has('budgets', 0)
        );
});

it('redirects guests from budget index to login', function () {
    $team = Team::factory()->create();

    $this->get(route('teams.budgets.index', ['current_team' => $team]))
        ->assertRedirect(route('login'));
});

// --- Budget create ---

it('renders the create budget page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('teams.budgets.create', ['current_team' => $user->currentTeam]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('budgets/create'));
});

// --- Budget store ---

it('can create a budget for the current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user)
        ->post(route('teams.budgets.store', ['current_team' => $team]), [
            'month' => '2026-03-01',
            'notes' => 'March budget',
        ])
        ->assertRedirect();

    expect(
        Budget::where('team_id', $team->id)
            ->whereDate('month', '2026-03-01')
            ->exists()
    )->toBeTrue();
});

it('requires a valid month when creating a budget', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('teams.budgets.store', ['current_team' => $user->currentTeam]), [
            'month' => 'not-a-date',
        ])
        ->assertSessionHasErrors(['month']);
});

it('cannot create a duplicate budget for the same month', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    Budget::factory()->for($team)->create(['month' => '2026-03-01']);

    $this->actingAs($user)
        ->post(route('teams.budgets.store', ['current_team' => $team]), [
            'month' => Carbon::parse('2026-03-01'),
        ])
        ->assertSessionHasErrors(['month']);
});

// --- Budget show ---

it('can view a budget belonging to the current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create(['month' => '2026-03-01']);
    $category = Category::where('team_id', $team->id)->first();
    BudgetLine::factory()->for($budget)->for($category)->create(['allocated_cents' => 50000]);

    $this->actingAs($user)
        ->get(route('teams.budgets.show', ['current_team' => $team, 'budget' => $budget]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('budgets/show')
            ->has('budget')
            ->has('budget.lines', 1)
        );
});

it('cannot view a budget belonging to another team', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $budget = Budget::factory()->for($otherTeam)->create();

    $this->actingAs($user)
        ->get(route('teams.budgets.show', ['current_team' => $user->currentTeam, 'budget' => $budget]))
        ->assertForbidden();
});

// --- Budget update ---

it('can update the notes on a budget', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create(['notes' => null]);

    $this->actingAs($user)
        ->put(route('teams.budgets.update', ['current_team' => $team, 'budget' => $budget]), [
            'notes' => 'Updated notes',
        ])
        ->assertRedirect();

    expect($budget->fresh()->notes)->toBe('Updated notes');
});

it('cannot update a budget belonging to another team', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $budget = Budget::factory()->for($otherTeam)->create();

    $this->actingAs($user)
        ->put(route('teams.budgets.update', ['current_team' => $user->currentTeam, 'budget' => $budget]), [
            'notes' => 'Hacked',
        ])
        ->assertForbidden();
});

// --- Budget lines ---

it('can add a budget line to a budget', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create();
    $category = Category::where('team_id', $team->id)->first();

    $this->actingAs($user)
        ->post(route('teams.budgets.lines.store', ['current_team' => $team, 'budget' => $budget]), [
            'category_id' => $category->id,
            'allocated_cents' => 75000,
        ])
        ->assertRedirect();

    expect(
        BudgetLine::where('budget_id', $budget->id)
            ->where('category_id', $category->id)
            ->where('allocated_cents', 75000)
            ->exists()
    )->toBeTrue();
});

it('requires a valid category when adding a budget line', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create();

    $this->actingAs($user)
        ->post(route('teams.budgets.lines.store', ['current_team' => $team, 'budget' => $budget]), [
            'category_id' => 99999,
            'allocated_cents' => 75000,
        ])
        ->assertSessionHasErrors(['category_id']);
});

it('cannot add a duplicate line for the same category', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create();
    $category = Category::where('team_id', $team->id)->first();
    BudgetLine::factory()->for($budget)->for($category)->create();

    $this->actingAs($user)
        ->post(route('teams.budgets.lines.store', ['current_team' => $team, 'budget' => $budget]), [
            'category_id' => $category->id,
            'allocated_cents' => 50000,
        ])
        ->assertSessionHasErrors(['category_id']);
});

it('can update a budget line allocated amount', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create();
    $category = Category::where('team_id', $team->id)->first();
    $line = BudgetLine::factory()->for($budget)->for($category)->create(['allocated_cents' => 10000]);

    $this->actingAs($user)
        ->put(route('teams.budgets.lines.update', ['current_team' => $team, 'budget' => $budget, 'line' => $line]), [
            'allocated_cents' => 20000,
        ])
        ->assertRedirect();

    expect($line->fresh()->allocated_cents)->toBe(20000);
});

it('can delete a budget line', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $budget = Budget::factory()->for($team)->create();
    $category = Category::where('team_id', $team->id)->first();
    $line = BudgetLine::factory()->for($budget)->for($category)->create();

    $this->actingAs($user)
        ->delete(route('teams.budgets.lines.destroy', ['current_team' => $team, 'budget' => $budget, 'line' => $line]))
        ->assertRedirect();

    expect(BudgetLine::find($line->id))->toBeNull();
});

it('cannot modify budget lines of another teams budget', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $budget = Budget::factory()->for($otherTeam)->create();
    $category = Category::factory()->for($otherTeam)->create();
    $line = BudgetLine::factory()->for($budget)->for($category)->create();

    $this->actingAs($user)
        ->put(route('teams.budgets.lines.update', ['current_team' => $user->currentTeam, 'budget' => $budget, 'line' => $line]), [
            'allocated_cents' => 99999,
        ])
        ->assertForbidden();
});
