<?php

namespace Database\Factories;

use App\Models\CsvImport;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CsvImport>
 */
class CsvImportFactory extends Factory
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
            'user_id' => User::factory(),
            'filename' => fake()->word().'.csv',
            'row_count' => 0,
            'status' => 'pending',
            'column_map' => null,
            'rows' => null,
        ];
    }

    public function complete(): static
    {
        return $this->state(fn () => [
            'status' => 'complete',
            'row_count' => 5,
        ]);
    }
}
