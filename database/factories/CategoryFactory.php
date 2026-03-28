<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
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
            'name' => fake()->words(2, true),
            'color' => fake()->hexColor(),
            'is_income' => false,
        ];
    }

    public function income(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_income' => true,
        ]);
    }
}
