import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { index as budgetsIndex, create as budgetsCreate, show as budgetShow } from '@/actions/App/Http/Controllers/BudgetController';

interface Budget {
    id: number;
    month: string;
    notes: string | null;
    total_cents: number | null;
    lines_count: number;
    lines_sum_allocated_cents: number | null;
    actual_cents: number;
}

interface Props {
    budgets: Budget[];
}

function formatMonth(month: string): string {
    // Slice to YYYY-MM-DD then treat as local midnight to avoid UTC-offset day shift
    return new Date(month.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
    });
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function BudgetsIndex({ budgets }: Props) {
    const { currentTeam } = usePage().props;

    return (
        <>
            <Head title="Budgets" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Budgets</h1>
                    {currentTeam && (
                        <Button asChild>
                            <Link href={budgetsCreate.url(currentTeam.slug)}>New Budget</Link>
                        </Button>
                    )}
                </div>

                {budgets.length === 0 ? (
                    <p className="text-muted-foreground">No budgets yet. Create one to get started.</p>
                ) : (
                    <div className="space-y-3">
                        {budgets.map((budget) => (
                            currentTeam && (
                                <Card key={budget.id} className="transition-colors hover:bg-muted/50">
                                    <CardContent className="p-0">
                                        <Link
                                            href={budgetShow.url({ current_team: currentTeam.slug, budget: budget.id })}
                                            className="flex w-full flex-col gap-3 px-6 py-4"
                                        >
                                            {/* Header row */}
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">{formatMonth(budget.month)}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {budget.lines_count} {budget.lines_count === 1 ? 'category' : 'categories'}
                                                    {budget.total_cents ? ` · ${formatCurrency(budget.total_cents)} total` : ''}
                                                </span>
                                            </div>

                                            {/* Stats row */}
                                            <div className="flex items-center gap-6 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Planned </span>
                                                    <span className="font-medium">{formatCurrency(budget.lines_sum_allocated_cents ?? 0)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Spent </span>
                                                    <span className="font-medium">{formatCurrency(budget.actual_cents)}</span>
                                                </div>
                                                {budget.total_cents ? (
                                                    <div>
                                                        <span className="text-muted-foreground">Remaining </span>
                                                        <span className={`font-medium ${budget.actual_cents + budget.total_cents < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                            {formatCurrency(budget.total_cents + budget.actual_cents)}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            {/* Progress bar (only when total is set) */}
                                            {budget.total_cents ? (() => {
                                                const planned = budget.lines_sum_allocated_cents ?? 0;
                                                const spent = Math.abs(budget.actual_cents);
                                                const total = budget.total_cents;
                                                const plannedPct = Math.min((planned / total) * 100, 100);
                                                const spentPct = Math.min((spent / total) * 100, 100);
                                                const overBudget = spent > total;
                                                return (
                                                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        {/* Planned layer */}
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
                                                            style={{ width: `${plannedPct}%` }}
                                                        />
                                                        {/* Spent layer */}
                                                        <div
                                                            className={`absolute inset-y-0 left-0 rounded-full ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
                                                            style={{ width: `${spentPct}%` }}
                                                        />
                                                    </div>
                                                );
                                            })() : null}

                                            {budget.notes && (
                                                <p className="text-xs text-muted-foreground">{budget.notes}</p>
                                            )}
                                        </Link>
                                    </CardContent>
                                </Card>
                            )
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

BudgetsIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Budgets',
            href: props.currentTeam ? budgetsIndex.url(props.currentTeam.slug) : '/',
        },
    ],
});
