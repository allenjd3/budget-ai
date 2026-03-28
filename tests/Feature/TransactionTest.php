<?php

use App\Models\Team;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\DefaultCategoriesSeeder;

beforeEach(function () {
    $this->seed(DefaultCategoriesSeeder::class);
});

// --- index ---

it('lists transactions for the current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $category = $team->categories()->first();

    Transaction::factory()->for($team)->withCategory($category)->create(['description' => 'Grocery run']);

    $this->actingAs($user)
        ->get(route('teams.transactions.index', ['current_team' => $team]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('transactions/index')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.description', 'Grocery run')
        );
});

it('does not show transactions from other teams', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();

    Transaction::factory()->for($otherTeam)->create();

    $this->actingAs($user)
        ->get(route('teams.transactions.index', ['current_team' => $user->currentTeam]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('transactions/index')
            ->has('transactions.data', 0)
        );
});

it('redirects guests from transaction index to login', function () {
    $team = Team::factory()->create();

    $this->get(route('teams.transactions.index', ['current_team' => $team]))
        ->assertRedirect(route('login'));
});

it('sorts transactions by transacted_at descending by default', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    Transaction::factory()->for($team)->create(['transacted_at' => '2026-01-01', 'description' => 'Older']);
    Transaction::factory()->for($team)->create(['transacted_at' => '2026-03-01', 'description' => 'Newer']);

    $this->actingAs($user)
        ->get(route('teams.transactions.index', ['current_team' => $team]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('transactions.data.0.description', 'Newer')
            ->where('transactions.data.1.description', 'Older')
        );
});

it('filters transactions by category', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $groceries = $team->categories()->where('name', 'Groceries')->first();
    $housing = $team->categories()->where('name', 'Housing')->first();

    Transaction::factory()->for($team)->withCategory($groceries)->create(['description' => 'Groceries tx']);
    Transaction::factory()->for($team)->withCategory($housing)->create(['description' => 'Housing tx']);

    $this->actingAs($user)
        ->get(route('teams.transactions.index', ['current_team' => $team, 'category_id' => $groceries->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('transactions.data', 1)
            ->where('transactions.data.0.description', 'Groceries tx')
        );
});

// --- create ---

it('renders the create transaction page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('teams.transactions.create', ['current_team' => $user->currentTeam]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('transactions/create')
            ->has('categories')
        );
});

// --- store ---

it('stores a new transaction', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $category = $team->categories()->first();

    $this->actingAs($user)
        ->post(route('teams.transactions.store', ['current_team' => $team]), [
            'transacted_at' => '2026-03-15',
            'description' => 'Coffee',
            'amount_cents' => -500,
            'category_id' => $category->id,
            'notes' => null,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('transactions', [
        'team_id' => $team->id,
        'description' => 'Coffee',
        'amount_cents' => -500,
        'category_id' => $category->id,
    ]);
});

it('validates required fields on store', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('teams.transactions.store', ['current_team' => $user->currentTeam]), [])
        ->assertSessionHasErrors(['transacted_at', 'description', 'amount_cents']);
});

it('validates category belongs to team on store', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $otherCategory = $otherTeam->categories()->first();

    $this->actingAs($user)
        ->post(route('teams.transactions.store', ['current_team' => $user->currentTeam]), [
            'transacted_at' => '2026-03-15',
            'description' => 'Coffee',
            'amount_cents' => -500,
            'category_id' => $otherCategory?->id,
        ])
        ->assertSessionHasErrors(['category_id']);
});

// --- edit ---

it('renders the edit transaction page', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $transaction = Transaction::factory()->for($team)->create();

    $this->actingAs($user)
        ->get(route('teams.transactions.edit', ['current_team' => $team, 'transaction' => $transaction]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('transactions/edit')
            ->has('transaction')
            ->has('categories')
        );
});

it('prevents another user from viewing an edit page', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $transaction = Transaction::factory()->for($user->currentTeam)->create();

    $this->actingAs($otherUser)
        ->get(route('teams.transactions.edit', ['current_team' => $otherUser->currentTeam, 'transaction' => $transaction]))
        ->assertForbidden();
});

// --- update ---

it('updates a transaction', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $transaction = Transaction::factory()->for($team)->create(['description' => 'Old']);

    $this->actingAs($user)
        ->patch(route('teams.transactions.update', ['current_team' => $team, 'transaction' => $transaction]), [
            'transacted_at' => '2026-03-20',
            'description' => 'Updated',
            'amount_cents' => -1000,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('transactions', [
        'id' => $transaction->id,
        'description' => 'Updated',
        'amount_cents' => -1000,
    ]);
});

it('prevents updating a transaction from another team', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $transaction = Transaction::factory()->for($user->currentTeam)->create();

    $this->actingAs($otherUser)
        ->patch(route('teams.transactions.update', ['current_team' => $otherUser->currentTeam, 'transaction' => $transaction]), [
            'transacted_at' => '2026-03-20',
            'description' => 'Hacked',
            'amount_cents' => -1000,
        ])
        ->assertForbidden();
});

// --- destroy ---

it('deletes a transaction', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $transaction = Transaction::factory()->for($team)->create();

    $this->actingAs($user)
        ->delete(route('teams.transactions.destroy', ['current_team' => $team, 'transaction' => $transaction]))
        ->assertRedirect(route('teams.transactions.index', ['current_team' => $team]));

    $this->assertDatabaseMissing('transactions', ['id' => $transaction->id]);
});

it('prevents deleting a transaction from another team', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $transaction = Transaction::factory()->for($user->currentTeam)->create();

    $this->actingAs($otherUser)
        ->delete(route('teams.transactions.destroy', ['current_team' => $otherUser->currentTeam, 'transaction' => $transaction]))
        ->assertForbidden();
});
