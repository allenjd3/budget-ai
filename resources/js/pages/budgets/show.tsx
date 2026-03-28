import { useState } from 'react';
import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as budgetsIndex, show as budgetShow, update as budgetUpdate } from '@/actions/App/Http/Controllers/BudgetController';
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
    total_cents: number | null;
    lines: BudgetLine[];
}

interface AvailableCategory {
    id: number;
    name: string;
    is_income: boolean;
}

interface Props {
    budget: Budget;
    availableCategories: AvailableCategory[];
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatMonth(month: string): string {
    // Slice to YYYY-MM-DD then treat as local midnight to avoid UTC-offset day shift
    return new Date(month.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
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

export default function BudgetsShow({ budget, availableCategories }: Props) {
    const { currentTeam } = usePage().props;

    const [allocations, setAllocations] = useState<Record<number, number>>(
        () => Object.fromEntries(budget.lines.map((l) => [l.id, l.allocated_cents])),
    );
    const [newLineCents, setNewLineCents] = useState(0);
    const [totalCents, setTotalCents] = useState<number | null>(budget.total_cents);

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

                {/* Planning summary */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
                            {/* Total budget setter */}
                            <Form
                                action={budgetUpdate.url({ current_team: currentTeam.slug, budget: budget.id })}
                                method="patch"
                                className="flex items-end gap-3"
                            >
                                {({ processing }) => (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="total_dollars">Total budget</Label>
                                            <Input
                                                id="total_dollars"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="e.g. 3000.00"
                                                className="w-36"
                                                defaultValue={totalCents !== null ? (totalCents / 100).toFixed(2) : ''}
                                                onChange={(e) => setTotalCents(toCents(e.target.value) || null)}
                                            />
                                            <input type="hidden" name="total_cents" value={totalCents ?? ''} readOnly />
                                        </div>
                                        <Button type="submit" variant="outline" size="sm" disabled={processing}>
                                            Save
                                        </Button>
                                    </>
                                )}
                            </Form>

                            {/* Allocation breakdown */}
                            {totalCents !== null && totalCents > 0 && (
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Allocated: <span className="font-medium text-foreground">{formatCurrency(totalAllocated)}</span>
                                            {' '}of {formatCurrency(totalCents)}
                                        </span>
                                        <span className={totalAllocated > totalCents ? 'font-medium text-destructive' : 'font-medium text-muted-foreground'}>
                                            {totalAllocated > totalCents
                                                ? `${formatCurrency(totalAllocated - totalCents)} over`
                                                : `${formatCurrency(totalCents - totalAllocated)} unallocated`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full transition-all ${totalAllocated > totalCents ? 'bg-destructive' : 'bg-primary'}`}
                                            style={{ width: `${Math.min((totalAllocated / totalCents) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

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

                {/* Add budget line — only shown when unbudgeted categories remain */}
                {availableCategories.length > 0 && (
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
                                                {availableCategories.filter((c) => !c.is_income).length > 0 && (
                                                    <optgroup label="Expenses">
                                                        {availableCategories
                                                            .filter((c) => !c.is_income)
                                                            .map((c) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                    </optgroup>
                                                )}
                                                {availableCategories.filter((c) => c.is_income).length > 0 && (
                                                    <optgroup label="Income">
                                                        {availableCategories
                                                            .filter((c) => c.is_income)
                                                            .map((c) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                    </optgroup>
                                                )}
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
                )}
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
