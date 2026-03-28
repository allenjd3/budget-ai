<?php

namespace App\Policies;

use App\Models\Budget;
use App\Models\User;

class BudgetPolicy
{
    public function view(User $user, Budget $budget): bool
    {
        return $user->currentTeam?->id === $budget->team_id;
    }

    public function update(User $user, Budget $budget): bool
    {
        return $user->currentTeam?->id === $budget->team_id;
    }

    public function delete(User $user, Budget $budget): bool
    {
        return $user->currentTeam?->id === $budget->team_id;
    }
}
