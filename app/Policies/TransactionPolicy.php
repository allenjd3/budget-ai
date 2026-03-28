<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    public function update(User $user, Transaction $transaction): bool
    {
        return $user->currentTeam?->id === $transaction->team_id;
    }

    public function delete(User $user, Transaction $transaction): bool
    {
        return $user->currentTeam?->id === $transaction->team_id;
    }
}
