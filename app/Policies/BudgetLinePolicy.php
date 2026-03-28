<?php

namespace App\Policies;

use App\Models\BudgetLine;
use App\Models\User;

class BudgetLinePolicy
{
    public function update(User $user, BudgetLine $budgetLine): bool
    {
        return $user->currentTeam?->id === $budgetLine->budget?->team_id;
    }

    public function delete(User $user, BudgetLine $budgetLine): bool
    {
        return $user->currentTeam?->id === $budgetLine->budget?->team_id;
    }
}
