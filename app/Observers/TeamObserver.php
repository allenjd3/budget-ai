<?php

namespace App\Observers;

use App\Models\Category;
use App\Models\DefaultCategory;
use App\Models\Team;

class TeamObserver
{
    public function created(Team $team): void
    {
        $defaults = DefaultCategory::all();

        $categories = $defaults->map(fn (DefaultCategory $default) => [
            'team_id' => $team->id,
            'name' => $default->name,
            'color' => $default->color,
            'is_income' => $default->is_income,
        ])->all();

        Category::insert($categories);
    }
}
