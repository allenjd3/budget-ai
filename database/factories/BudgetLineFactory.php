<?php

namespace Database\Factories;

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetLine>
 */
class BudgetLineFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'budget_id' => Budget::factory(),
            'category_id' => Category::factory(),
            'allocated_cents' => fake()->numberBetween(5000, 200000),
        ];
    }
}
