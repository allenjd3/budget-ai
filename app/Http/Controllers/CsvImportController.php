<?php

namespace App\Http\Controllers;

use App\Models\CsvImport;
use App\Models\Team;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use SplFileObject;

class CsvImportController extends Controller
{
    public function index(Team $currentTeam): Response
    {
        return Inertia::render('imports/index', [
            'imports' => CsvImport::where('team_id', $currentTeam->id)
                ->orderByDesc('created_at')
                ->get(['id', 'filename', 'row_count', 'status', 'created_at']),
        ]);
    }

    public function store(Request $request, Team $currentTeam): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $allRows = $this->parseCsv($file);

        if (empty($allRows)) {
            throw ValidationException::withMessages([
                'file' => 'The CSV file appears to be empty.',
            ]);
        }

        $import = CsvImport::create([
            'team_id' => $currentTeam->id,
            'user_id' => $request->user()?->id,
            'filename' => $file->getClientOriginalName(),
            'row_count' => count($allRows),
            'status' => 'pending',
            'rows' => $allRows,
        ]);

        return redirect()->route('teams.imports.map', [
            'current_team' => $currentTeam,
            'import' => $import,
        ]);
    }

    /**
     * Parse a CSV file into an array of associative rows using the first row as keys.
     *
     * @return array<int, array<string, string>>
     */
    private function parseCsv(UploadedFile $file): array
    {
        $csv = new SplFileObject($file->getPathname(), 'r');
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD);

        $headers = null;
        $rows = [];

        foreach ($csv as $row) {
            /** @var list<string>|false $row */
            if ($row === false) {
                continue;
            }

            if ($headers === null) {
                $headers = $row;

                continue;
            }

            if (count($row) !== count($headers)) {
                continue;
            }

            /** @var array<string, string> $assoc */
            $assoc = array_combine($headers, $row);
            $rows[] = $assoc;
        }

        return $rows;
    }

    public function map(Team $currentTeam, CsvImport $import): Response
    {
        Gate::authorize('view', $import);

        /** @var array<int, array<string, string>> $rows */
        $rows = $import->rows ?? [];
        $columns = array_keys((array) ($rows[0] ?? []));
        $preview = array_slice($rows, 0, 5);

        return Inertia::render('imports/map', [
            'import' => $import->only(['id', 'filename', 'row_count']),
            'columns' => $columns,
            'preview' => $preview,
            'column_map' => $import->column_map,
        ]);
    }

    public function confirm(Request $request, Team $currentTeam, CsvImport $import): RedirectResponse
    {
        Gate::authorize('update', $import);

        if ($import->status === 'complete') {
            return redirect()->route('teams.imports.index', ['current_team' => $currentTeam]);
        }

        $validated = $request->validate([
            'date_column' => ['required', 'string'],
            'description_column' => ['required', 'string'],
            'amount_column' => ['required', 'string'],
            'category_id' => [
                'nullable',
                Rule::exists('categories', 'id')->where('team_id', $currentTeam->id),
            ],
        ]);

        $import->update([
            'status' => 'processing',
            'column_map' => [
                'date' => $validated['date_column'],
                'description' => $validated['description_column'],
                'amount' => $validated['amount_column'],
            ],
        ]);

        /** @var array<int, array<string, string>> $rows */
        $rows = $import->rows ?? [];
        $dateCol = $validated['date_column'];
        $descCol = $validated['description_column'];
        $amountCol = $validated['amount_column'];
        $categoryId = $validated['category_id'] ?? null;

        $created = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $date = $row[$dateCol] ?? null;
            $description = trim((string) ($row[$descCol] ?? ''));
            $rawAmount = $row[$amountCol] ?? null;

            if (! $date || ! $description || $rawAmount === null) {
                $skipped++;

                continue;
            }

            $parsedDate = rescue(fn () => Carbon::parse((string) $date)->toDateString(), null, false);

            if (! $parsedDate) {
                $skipped++;

                continue;
            }

            $amountCents = (int) round((float) str_replace([',', '$', ' '], '', (string) $rawAmount) * 100);

            $duplicate = Transaction::where('team_id', $currentTeam->id)
                ->whereDate('transacted_at', $parsedDate)
                ->where('amount_cents', $amountCents)
                ->where('description', $description)
                ->exists();

            if ($duplicate) {
                $skipped++;

                continue;
            }

            $currentTeam->transactions()->create([
                'transacted_at' => $parsedDate,
                'description' => $description,
                'amount_cents' => $amountCents,
                'category_id' => $categoryId,
                'categorized_by' => 'user',
            ]);

            $created++;
        }

        $import->update([
            'status' => 'complete',
            'row_count' => $created,
        ]);

        return redirect()
            ->route('teams.transactions.index', ['current_team' => $currentTeam])
            ->with('success', "Imported {$created} transactions. Skipped {$skipped}.");
    }
}
