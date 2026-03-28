import { useState } from 'react';
import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as budgetsIndex, show as budgetShow } from '@/actions/App/Http/Controllers/BudgetController';
import { store as linesStore, update as lineUpdate, destroy as lineDestroy } from '@/actions/App/Http/Controllers/BudgetLineController';

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
    actual_cents: number;
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

function toCents(dollars: string): number {
    return Math.round(parseFloat(dollars || '0') * 100);
}

function remaining(line: BudgetLine): number {
    if (line.category.is_income) {
        // How much above/below expected income
        return line.actual_cents - line.allocated_cents;
    }
    // How much budget is left (actual is negative for expenses)
    return line.allocated_cents + line.actual_cents;
}

export default function BudgetsShow({ budget }: Props) {
    const { currentTeam } = usePage().props;

    const [allocations, setAllocations] = useState<Record<number, number>>(
        () => Object.fromEntries(budget.lines.map((l) => [l.id, l.allocated_cents])),
    );
    const [newLineCents, setNewLineCents] = useState(0);

    if (!currentTeam) {
        return null;
    }

    const totalAllocated = budget.lines.reduce((sum, line) => sum + line.allocated_cents, 0);
    const totalActual = budget.lines.reduce((sum, line) => sum + line.actual_cents, 0);
    const totalRemaining = budget.lines.reduce((sum, line) => sum + remaining(line), 0);

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
                                        <th className="pb-2 font-medium">Allocated</th>
                                        <th className="pb-2 font-medium">Actual</th>
                                        <th className="pb-2 font-medium">Remaining</th>
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
                                            <td className="py-2">
                                                <Form
                                                    action={lineUpdate.url({
                                                        current_team: currentTeam.slug,
                                                        budget: budget.id,
                                                        line: line.id,
                                                    })}
                                                    method="patch"
                                                    className="flex items-center gap-2"
                                                >
                                                    {({ processing }) => (
                                                        <>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                defaultValue={(line.allocated_cents / 100).toFixed(2)}
                                                                placeholder="0.00"
                                                                className="w-28"
                                                                onChange={(e) =>
                                                                    setAllocations((prev) => ({
                                                                        ...prev,
                                                                        [line.id]: toCents(e.target.value),
                                                                    }))
                                                                }
                                                            />
                                                            <input
                                                                type="hidden"
                                                                name="allocated_cents"
                                                                value={allocations[line.id] ?? line.allocated_cents}
                                                                readOnly
                                                            />
                                                            <Button
                                                                type="submit"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={processing}
                                                            >
                                                                Save
                                                            </Button>
                                                        </>
                                                    )}
                                                </Form>
                                            </td>
                                            <td className="py-2 text-sm text-muted-foreground">
                                                {formatCurrency(line.actual_cents)}
                                            </td>
                                            <td className={`py-2 text-sm font-medium ${remaining(line) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                                {remaining(line) >= 0 ? '+' : ''}
                                                {formatCurrency(remaining(line))}
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
                                        <td className="pt-2">{formatCurrency(totalAllocated)}</td>
                                        <td className="pt-2 text-sm text-muted-foreground">{formatCurrency(totalActual)}</td>
                                        <td className={`pt-2 text-sm ${totalRemaining >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                            {totalRemaining >= 0 ? '+' : ''}
                                            {formatCurrency(totalRemaining)}
                                        </td>
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
                                        <Label htmlFor="allocated_dollars">Amount</Label>
                                        <Input
                                            id="allocated_dollars"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            className="w-36"
                                            onChange={(e) => setNewLineCents(toCents(e.target.value))}
                                        />
                                        <input type="hidden" name="allocated_cents" value={newLineCents} readOnly />
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

// Single-param function so Inertia treats the return value as layout props (length <= 1 check)
BudgetsShow.layout = (props: { currentTeam?: { slug: string } | null; budget?: { id: number; month: string } }) => ({
    breadcrumbs: [
        {
            title: 'Budgets',
            href: props.currentTeam ? budgetsIndex.url(props.currentTeam.slug) : '/',
        },
        {
            title: props.budget ? formatMonth(props.budget.month) : 'Budget',
            href:
                props.currentTeam && props.budget
                    ? budgetShow.url({ current_team: props.currentTeam.slug, budget: props.budget.id })
                    : '/',
        },
    ],
});
