<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Team;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
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
            'category_id' => null,
            'transacted_at' => Carbon::now()->subDays(fake()->numberBetween(0, 30))->toDateString(),
            'description' => fake()->sentence(3),
            'amount_cents' => fake()->numberBetween(-50000, -100),
            'notes' => null,
            'categorized_by' => 'user',
        ];
    }

    public function income(): static
    {
        return $this->state(fn (array $attributes) => [
            'amount_cents' => fake()->numberBetween(10000, 500000),
        ]);
    }

    public function withCategory(Category $category): static
    {
        return $this->state(fn (array $attributes) => [
            'category_id' => $category->id,
        ]);
    }
}
