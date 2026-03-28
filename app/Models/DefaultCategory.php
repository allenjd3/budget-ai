<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DefaultCategory extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_income' => 'boolean',
        ];
    }
}
