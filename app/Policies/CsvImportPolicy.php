<?php

namespace App\Policies;

use App\Models\CsvImport;
use App\Models\User;

class CsvImportPolicy
{
    public function view(User $user, CsvImport $csvImport): bool
    {
        return $user->currentTeam?->id === $csvImport->team_id;
    }

    public function update(User $user, CsvImport $csvImport): bool
    {
        return $user->currentTeam?->id === $csvImport->team_id;
    }
}
