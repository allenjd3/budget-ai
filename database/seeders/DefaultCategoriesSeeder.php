<?php

namespace Database\Seeders;

use App\Models\DefaultCategory;
use Illuminate\Database\Seeder;

class DefaultCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Housing', 'color' => '#6366f1', 'is_income' => false],
            ['name' => 'Groceries', 'color' => '#22c55e', 'is_income' => false],
            ['name' => 'Transport', 'color' => '#f59e0b', 'is_income' => false],
            ['name' => 'Utilities', 'color' => '#3b82f6', 'is_income' => false],
            ['name' => 'Healthcare', 'color' => '#ef4444', 'is_income' => false],
            ['name' => 'Dining Out', 'color' => '#f97316', 'is_income' => false],
            ['name' => 'Entertainment', 'color' => '#a855f7', 'is_income' => false],
            ['name' => 'Clothing', 'color' => '#ec4899', 'is_income' => false],
            ['name' => 'Personal Care', 'color' => '#14b8a6', 'is_income' => false],
            ['name' => 'Education', 'color' => '#0ea5e9', 'is_income' => false],
            ['name' => 'Savings', 'color' => '#84cc16', 'is_income' => false],
            ['name' => 'Salary', 'color' => '#10b981', 'is_income' => true],
            ['name' => 'Other Income', 'color' => '#6b7280', 'is_income' => true],
            ['name' => 'Other Expense', 'color' => '#9ca3af', 'is_income' => false],
        ];

        foreach ($categories as $category) {
            DefaultCategory::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
