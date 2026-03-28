import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as budgetsIndex, show as budgetShow } from '@/actions/App/Http/Controllers/BudgetController';
import { store as linesStore, destroy as lineDestroy } from '@/actions/App/Http/Controllers/BudgetLineController';

interface Category {
    id: number;
    name: string;
    color: string | null;
    is_income: boolean;
}

interface BudgetLine {
    id: number;
    category_id: number;
    allocated_cents: number;
    category: Category;
}

interface Budget {
    id: number;
    month: string;
    notes: string | null;
    lines: BudgetLine[];
}

interface Props {
    budget: Budget;
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatMonth(month: string): string {
    return new Date(month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
    });
}

export default function BudgetsShow({ budget }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) {
        return null;
    }

    const totalAllocated = budget.lines.reduce((sum, line) => sum + line.allocated_cents, 0);

    return (
        <>
            <Head title={`Budget — ${formatMonth(budget.month)}`} />
            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">{formatMonth(budget.month)}</h1>
                    {budget.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{budget.notes}</p>
                    )}
                </div>

                {/* Budget lines */}
                <Card>
                    <CardHeader>
                        <CardTitle>Budget Lines</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {budget.lines.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No lines yet. Add one below.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-2 font-medium">Category</th>
                                        <th className="pb-2 text-right font-medium">Allocated</th>
                                        <th className="pb-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {budget.lines.map((line) => (
                                        <tr key={line.id}>
                                            <td className="py-2">
                                                <div className="flex items-center gap-2">
                                                    {line.category.color && (
                                                        <span
                                                            className="inline-block size-3 rounded-full"
                                                            style={{ backgroundColor: line.category.color }}
                                                        />
                                                    )}
                                                    {line.category.name}
                                                </div>
                                            </td>
                                            <td className="py-2 text-right">
                                                {formatCurrency(line.allocated_cents)}
                                            </td>
                                            <td className="py-2 text-right">
                                                <Form
                                                    action={lineDestroy.url({
                                                        current_team: currentTeam.slug,
                                                        budget: budget.id,
                                                        line: line.id,
                                                    })}
                                                    method="delete"
                                                    className="inline"
                                                >
                                                    {({ processing }) => (
                                                        <Button
                                                            type="submit"
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={processing}
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </Form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t font-medium">
                                        <td className="pt-2">Total</td>
                                        <td className="pt-2 text-right">{formatCurrency(totalAllocated)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </CardContent>
                </Card>

                {/* Add budget line */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add Line</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={linesStore.url({ current_team: currentTeam.slug, budget: budget.id })}
                            method="post"
                            resetOnSuccess
                            className="flex items-end gap-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="category_id">Category</Label>
                                        <select
                                            id="category_id"
                                            name="category_id"
                                            className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                                        >
                                            <option value="">Select category…</option>
                                        </select>
                                        {errors.category_id && (
                                            <p className="text-sm text-destructive">{errors.category_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="allocated_cents">Amount (cents)</Label>
                                        <Input
                                            id="allocated_cents"
                                            type="number"
                                            name="allocated_cents"
                                            min="0"
                                            className="w-36"
                                        />
                                        {errors.allocated_cents && (
                                            <p className="text-sm text-destructive">{errors.allocated_cents}</p>
                                        )}
                                    </div>

                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Adding…' : 'Add Line'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

BudgetsShow.layout = (
    props: { currentTeam?: { slug: string } | null },
    pageProps?: { budget?: { id: number; month: string } },
) => ({
    breadcrumbs: [
        {
            title: 'Budgets',
            href: props.currentTeam ? budgetsIndex.url(props.currentTeam.slug) : '/',
        },
        {
            title: pageProps?.budget ? formatMonth(pageProps.budget.month) : 'Budget',
            href:
                props.currentTeam && pageProps?.budget
                    ? budgetShow.url({ current_team: props.currentTeam.slug, budget: pageProps.budget.id })
                    : '/',
        },
    ],
});
