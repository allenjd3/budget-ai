import { useState, useRef } from 'react';
import { Head, Form, usePage } from '@inertiajs/react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    if (!currentTeam) {
        return null;
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        // Only clear if leaving the drop zone entirely (not a child element)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragging(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) {
            setFile(dropped);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFile(e.target.files?.[0] ?? null);
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
                                    {/* Drop zone */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                                        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                                            dragging
                                                ? 'border-primary bg-primary/5'
                                                : 'border-input hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                    >
                                        <UploadCloud className={`size-8 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
                                        {file ? (
                                            <div>
                                                <p className="text-sm font-medium">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(file.size / 1024).toFixed(1)} KB · Click to change
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Drop your CSV here, or <span className="text-primary">browse</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">CSV or TXT · Max 5 MB</p>
                                            </div>
                                        )}
                                        <input
                                            ref={inputRef}
                                            type="file"
                                            name="file"
                                            accept=".csv,.txt"
                                            className="sr-only"
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    {errors.file && (
                                        <p className="text-sm text-destructive">{errors.file}</p>
                                    )}

                                    <Button type="submit" disabled={processing || !file} className="w-full">
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
