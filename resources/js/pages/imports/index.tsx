import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    index as importsIndex,
    store as importsStore,
} from '@/actions/App/Http/Controllers/CsvImportController';

interface CsvImport {
    id: number;
    filename: string;
    row_count: number;
    status: 'pending' | 'processing' | 'complete' | 'failed';
    created_at: string;
}

interface Props {
    imports: CsvImport[];
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const statusLabel: Record<CsvImport['status'], string> = {
    pending: 'Pending',
    processing: 'Processing',
    complete: 'Complete',
    failed: 'Failed',
};

const statusClass: Record<CsvImport['status'], string> = {
    pending: 'text-muted-foreground',
    processing: 'text-blue-600',
    complete: 'text-green-600',
    failed: 'text-destructive',
};

export default function ImportsIndex({ imports }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) {
        return null;
    }

    return (
        <>
            <Head title="Import Transactions" />
            <div className="space-y-6 p-4">
                <h1 className="text-2xl font-semibold">Import Transactions</h1>

                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle>Upload CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={importsStore.url(currentTeam.slug)}
                            method="post"
                            encType="multipart/form-data"
                        >
                            {({ errors, processing }) => (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="file">CSV File</Label>
                                        <Input
                                            id="file"
                                            type="file"
                                            name="file"
                                            accept=".csv,.txt"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Upload a CSV exported from your bank. Max 5 MB.
                                        </p>
                                        {errors.file && (
                                            <p className="text-sm text-destructive">{errors.file}</p>
                                        )}
                                    </div>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Uploading…' : 'Upload & Map Columns'}
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </CardContent>
                </Card>

                {imports.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium">Import History</h2>
                        <Card>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">File</th>
                                            <th className="px-4 py-3 font-medium">Rows</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                            <th className="px-4 py-3 font-medium">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {imports.map((imp) => (
                                            <tr key={imp.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-3">{imp.filename}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{imp.row_count}</td>
                                                <td className={`px-4 py-3 font-medium ${statusClass[imp.status]}`}>
                                                    {statusLabel[imp.status]}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(imp.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}

ImportsIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Import Transactions',
            href: props.currentTeam ? importsIndex.url(props.currentTeam.slug) : '/',
        },
    ],
});
