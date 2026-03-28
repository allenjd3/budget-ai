import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    index as importsIndex,
    confirm as importsConfirm,
} from '@/actions/App/Http/Controllers/CsvImportController';

interface ImportMeta {
    id: number;
    filename: string;
    row_count: number;
}

interface ColumnMap {
    date?: string;
    description?: string;
    amount?: string;
}

interface Props {
    import: ImportMeta;
    columns: string[];
    preview: Record<string, string>[];
    column_map: ColumnMap | null;
}

function autoGuess(columns: string[], keywords: string[]): string {
    return (
        columns.find((col) =>
            keywords.some((kw) => col.toLowerCase().includes(kw)),
        ) ?? ''
    );
}

export default function ImportsMap({ import: imp, columns, preview, column_map }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) {
        return null;
    }

    const defaultDate = column_map?.date ?? autoGuess(columns, ['date', 'posted', 'time']);
    const defaultDesc = column_map?.description ?? autoGuess(columns, ['desc', 'memo', 'narr', 'payee', 'detail']);
    const defaultAmount = column_map?.amount ?? autoGuess(columns, ['amount', 'debit', 'credit', 'sum', 'total']);

    const selectClass =
        'border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none';

    return (
        <>
            <Head title="Map Columns" />
            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Map Columns</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {imp.filename} &mdash; {imp.row_count} rows
                    </p>
                </div>

                <Form
                    action={importsConfirm.url({ current_team: currentTeam.slug, import: imp.id })}
                    method="post"
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <Card className="max-w-lg">
                                <CardHeader>
                                    <CardTitle>Column Mapping</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="date_column">Date column</Label>
                                        <select
                                            id="date_column"
                                            name="date_column"
                                            className={selectClass}
                                            defaultValue={defaultDate}
                                        >
                                            <option value="">— select —</option>
                                            {columns.map((col) => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                        {errors.date_column && (
                                            <p className="text-sm text-destructive">{errors.date_column}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="description_column">Description column</Label>
                                        <select
                                            id="description_column"
                                            name="description_column"
                                            className={selectClass}
                                            defaultValue={defaultDesc}
                                        >
                                            <option value="">— select —</option>
                                            {columns.map((col) => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                        {errors.description_column && (
                                            <p className="text-sm text-destructive">{errors.description_column}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="amount_column">Amount column</Label>
                                        <select
                                            id="amount_column"
                                            name="amount_column"
                                            className={selectClass}
                                            defaultValue={defaultAmount}
                                        >
                                            <option value="">— select —</option>
                                            {columns.map((col) => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                        {errors.amount_column && (
                                            <p className="text-sm text-destructive">{errors.amount_column}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {preview.length > 0 && (
                                <div className="space-y-2">
                                    <h2 className="text-base font-medium">Preview (first {preview.length} rows)</h2>
                                    <div className="overflow-x-auto rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                                                    {columns.map((col) => (
                                                        <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {preview.map((row, i) => (
                                                    <tr key={i} className="hover:bg-muted/50">
                                                        {columns.map((col) => (
                                                            <td key={col} className="px-3 py-2 whitespace-nowrap">
                                                                {row[col] ?? ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <Button type="submit" disabled={processing}>
                                {processing ? 'Importing…' : `Import ${imp.row_count} Rows`}
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

ImportsMap.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Import Transactions',
            href: props.currentTeam ? importsIndex.url(props.currentTeam.slug) : '/',
        },
        {
            title: 'Map Columns',
            href: '/',
        },
    ],
});
