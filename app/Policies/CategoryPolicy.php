<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

class CategoryPolicy
{
    public function update(User $user, Category $category): bool
    {
        return $user->currentTeam?->id === $category->team_id;
    }

    public function delete(User $user, Category $category): bool
    {
        return $user->currentTeam?->id === $category->team_id;
    }
}
