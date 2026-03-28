<?php

use App\Models\CsvImport;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\DefaultCategoriesSeeder;
use Illuminate\Http\UploadedFile;

beforeEach(function () {
    $this->seed(DefaultCategoriesSeeder::class);
});

// --- index ---

it('renders the imports index page', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    CsvImport::factory()->for($team)->for($user)->complete()->create(['filename' => 'bank.csv']);

    $this->actingAs($user)
        ->get(route('teams.imports.index', ['current_team' => $team]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('imports/index')
            ->has('imports', 1)
            ->where('imports.0.filename', 'bank.csv')
        );
});

it('does not show imports from other teams on index', function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();

    CsvImport::factory()->for($otherTeam)->for($user)->create();

    $this->actingAs($user)
        ->get(route('teams.imports.index', ['current_team' => $user->currentTeam]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('imports', 0));
});

it('redirects guests from imports index to login', function () {
    $team = Team::factory()->create();

    $this->get(route('teams.imports.index', ['current_team' => $team]))
        ->assertRedirect(route('login'));
});

// --- store ---

it('uploads a csv and redirects to map page', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $csv = UploadedFile::fake()->createWithContent('transactions.csv', implode("\n", [
        'date,description,amount',
        '2026-01-15,Grocery Store,-52.34',
        '2026-01-16,Gas Station,-40.00',
    ]));

    $this->actingAs($user)
        ->post(route('teams.imports.store', ['current_team' => $team]), ['file' => $csv])
        ->assertRedirect();

    $import = CsvImport::where('team_id', $team->id)->first();
    expect($import)->not->toBeNull()
        ->and($import->filename)->toBe('transactions.csv')
        ->and($import->row_count)->toBe(2)
        ->and($import->status)->toBe('pending');
});

it('rejects a non-csv upload', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $file = UploadedFile::fake()->create('data.pdf', 100, 'application/pdf');

    $this->actingAs($user)
        ->post(route('teams.imports.store', ['current_team' => $team]), ['file' => $file])
        ->assertSessionHasErrors('file');
});

it('rejects an empty csv', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $csv = UploadedFile::fake()->createWithContent('empty.csv', "date,description,amount\n");

    $this->actingAs($user)
        ->post(route('teams.imports.store', ['current_team' => $team]), ['file' => $csv])
        ->assertSessionHasErrors('file');
});

it('redirects guests from store to login', function () {
    $team = Team::factory()->create();
    $csv = UploadedFile::fake()->createWithContent('t.csv', "date,description,amount\n2026-01-01,Test,-10\n");

    $this->post(route('teams.imports.store', ['current_team' => $team]), ['file' => $csv])
        ->assertRedirect(route('login'));
});

// --- map ---

it('renders the map page for an import', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $import = CsvImport::factory()->for($team)->for($user)->create([
        'rows' => [
            ['date' => '2026-01-15', 'description' => 'Grocery Store', 'amount' => '-52.34'],
        ],
    ]);

    $this->actingAs($user)
        ->get(route('teams.imports.map', ['current_team' => $team, 'import' => $import]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('imports/map')
            ->where('import.id', $import->id)
            ->has('columns', 3)
            ->has('preview', 1)
        );
});

it("forbids viewing another team's import on map page", function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $otherUser = User::factory()->create();

    $import = CsvImport::factory()->for($otherTeam)->for($otherUser)->create([
        'rows' => [['date' => '2026-01-01', 'description' => 'Test', 'amount' => '-10']],
    ]);

    $this->actingAs($user)
        ->get(route('teams.imports.map', ['current_team' => $otherTeam, 'import' => $import]))
        ->assertForbidden();
});

// --- confirm ---

it('creates transactions from mapped csv columns', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $import = CsvImport::factory()->for($team)->for($user)->create([
        'rows' => [
            ['Date' => '2026-01-15', 'Details' => 'Grocery Store', 'Amount' => '-52.34'],
            ['Date' => '2026-01-16', 'Details' => 'Gas Station', 'Amount' => '-40.00'],
        ],
    ]);

    $this->actingAs($user)
        ->post(route('teams.imports.confirm', ['current_team' => $team, 'import' => $import]), [
            'date_column' => 'Date',
            'description_column' => 'Details',
            'amount_column' => 'Amount',
        ])
        ->assertRedirect(route('teams.transactions.index', ['current_team' => $team]));

    expect(Transaction::where('team_id', $team->id)->count())->toBe(2);

    $tx = Transaction::where('team_id', $team->id)->where('description', 'Grocery Store')->first();
    expect($tx)->not->toBeNull()
        ->and($tx->amount_cents)->toBe(-5234)
        ->and($tx->transacted_at->toDateString())->toBe('2026-01-15')
        ->and($tx->categorized_by)->toBe('user');

    $import->refresh();
    expect($import->status)->toBe('complete')
        ->and($import->row_count)->toBe(2);
});

it('skips duplicate transactions on confirm', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    Transaction::factory()->for($team)->create([
        'transacted_at' => '2026-01-15',
        'description' => 'Grocery Store',
        'amount_cents' => -5234,
    ]);

    $import = CsvImport::factory()->for($team)->for($user)->create([
        'rows' => [
            ['date' => '2026-01-15', 'description' => 'Grocery Store', 'amount' => '-52.34'],
            ['date' => '2026-01-16', 'description' => 'Gas Station', 'amount' => '-40.00'],
        ],
    ]);

    $this->actingAs($user)
        ->post(route('teams.imports.confirm', ['current_team' => $team, 'import' => $import]), [
            'date_column' => 'date',
            'description_column' => 'description',
            'amount_column' => 'amount',
        ])
        ->assertRedirect();

    expect(Transaction::where('team_id', $team->id)->count())->toBe(2);
});

it('skips rows with missing required fields on confirm', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $import = CsvImport::factory()->for($team)->for($user)->create([
        'rows' => [
            ['date' => '2026-01-15', 'description' => '', 'amount' => '-52.34'],
            ['date' => '2026-01-16', 'description' => 'Gas Station', 'amount' => '-40.00'],
        ],
    ]);

    $this->actingAs($user)
        ->post(route('teams.imports.confirm', ['current_team' => $team, 'import' => $import]), [
            'date_column' => 'date',
            'description_column' => 'description',
            'amount_column' => 'amount',
        ]);

    expect(Transaction::where('team_id', $team->id)->count())->toBe(1);
});

it('validates required column mapping fields on confirm', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $import = CsvImport::factory()->for($team)->for($user)->create([
        'rows' => [['date' => '2026-01-15', 'description' => 'Test', 'amount' => '-10']],
    ]);

    $this->actingAs($user)
        ->post(route('teams.imports.confirm', ['current_team' => $team, 'import' => $import]), [])
        ->assertSessionHasErrors(['date_column', 'description_column', 'amount_column']);
});

it("forbids confirming another team's import", function () {
    $user = User::factory()->create();
    $otherTeam = Team::factory()->create();
    $otherUser = User::factory()->create();

    $import = CsvImport::factory()->for($otherTeam)->for($otherUser)->create([
        'rows' => [['date' => '2026-01-01', 'description' => 'Test', 'amount' => '-10']],
    ]);

    $this->actingAs($user)
        ->post(route('teams.imports.confirm', ['current_team' => $otherTeam, 'import' => $import]), [
            'date_column' => 'date',
            'description_column' => 'description',
            'amount_column' => 'amount',
        ])
        ->assertForbidden();
});
