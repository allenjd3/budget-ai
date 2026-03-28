<?php

namespace Database\Factories;

use App\Models\Budget;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Budget>
 */
class BudgetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'month' => Carbon::now()->startOfMonth()->toDateString(),
            'notes' => null,
        ];
    }

    public function forMonth(Carbon $month): static
    {
        return $this->state(fn (array $attributes) => [
            'month' => $month->copy()->startOfMonth()->toDateString(),
        ]);
    }
}
