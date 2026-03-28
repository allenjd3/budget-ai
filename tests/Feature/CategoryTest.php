<?php

use App\Models\Category;
use App\Models\DefaultCategory;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\DefaultCategoriesSeeder;

beforeEach(function () {
    $this->seed(DefaultCategoriesSeeder::class);
});

it('copies default categories to a team when the team is created', function () {
    $team = Team::factory()->create();

    expect(Category::where('team_id', $team->id)->count())
        ->toBe(DefaultCategory::count());
});

it('copies default category fields accurately', function () {
    $default = DefaultCategory::first();
    $team = Team::factory()->create();

    $copy = Category::where('team_id', $team->id)
        ->where('name', $default->name)
        ->first();

    expect($copy)->not->toBeNull()
        ->and($copy->color)->toBe($default->color)
        ->and($copy->is_income)->toBe($default->is_income);
});

it('shows categories for the authenticated users current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user)
        ->get(route('teams.categories.index', ['current_team' => $team]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('categories/index')
            ->has('categories', DefaultCategory::count())
        );
});

it('does not show categories from other teams', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    Category::factory()->for($otherTeam)->create(['name' => 'Secret Sauce']);

    $this->actingAs($user)
        ->get(route('teams.categories.index', ['current_team' => $user->currentTeam]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('categories/index')
            ->where('categories', fn ($categories) => ! collect($categories)->contains('name', 'Secret Sauce'))
        );
});

it('redirects guests to the login page', function () {
    $team = Team::factory()->create();

    $this->get(route('teams.categories.index', ['current_team' => $team]))
        ->assertRedirect(route('login'));
});

it('can create a custom category', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user)
        ->post(route('teams.categories.store', ['current_team' => $team]), [
            'name' => 'Coffee Fund',
            'color' => '#6f4e37',
            'is_income' => false,
        ])
        ->assertRedirect();

    expect(
        Category::where('team_id', $team->id)
            ->where('name', 'Coffee Fund')
            ->exists()
    )->toBeTrue();
});

it('requires a name when creating a category', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('teams.categories.store', ['current_team' => $user->currentTeam]), ['name' => ''])
        ->assertSessionHasErrors(['name']);
});

it('can update a category belonging to the current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $category = Category::where('team_id', $team->id)->first();

    $this->actingAs($user)
        ->put(route('teams.categories.update', ['current_team' => $team, 'category' => $category]), [
            'name' => 'Renamed',
            'color' => '#123456',
            'is_income' => true,
        ])
        ->assertRedirect();

    expect($category->fresh())
        ->name->toBe('Renamed')
        ->color->toBe('#123456')
        ->is_income->toBeTrue();
});

it('cannot update a category belonging to another team', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $category = Category::factory()->for($otherTeam)->create();

    $this->actingAs($user)
        ->put(route('teams.categories.update', ['current_team' => $user->currentTeam, 'category' => $category]), [
            'name' => 'Hacked',
        ])
        ->assertForbidden();
});

it('can delete a category belonging to the current team', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $category = Category::factory()->for($team)->create();

    $this->actingAs($user)
        ->delete(route('teams.categories.destroy', ['current_team' => $team, 'category' => $category]))
        ->assertRedirect();

    expect(Category::find($category->id))->toBeNull();
});

it('cannot delete a category belonging to another team', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $category = Category::factory()->for($otherTeam)->create();

    $this->actingAs($user)
        ->delete(route('teams.categories.destroy', ['current_team' => $user->currentTeam, 'category' => $category]))
        ->assertForbidden();
});
