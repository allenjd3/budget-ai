import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardController from '@/actions/App/Http/Controllers/DashboardController';
import { create as budgetCreate, show as budgetShow, index as budgetsIndex } from '@/actions/App/Http/Controllers/BudgetController';

interface Category {
    id: number;
    name: string;
    color: string | null;
    is_income: boolean;
}

interface BudgetLine {
    id: number;
    allocated_cents: number;
    actual_cents: number;
    category: Category;
}

interface Budget {
    id: number;
    month: string;
    notes: string | null;
    lines?: BudgetLine[];
}

interface Transaction {
    id: number;
    description: string;
    amount_cents: number;
    transacted_at: string;
    category: Category | null;
}

interface Props {
    currentMonthBudget: Budget | null;
    recentTransactions: Transaction[];
    recentBudgets: Budget[];
}

function formatMonth(month: string): string {
    return new Date(month.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function formatDate(dateStr: string): string {
    return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function Dashboard({ currentMonthBudget, recentTransactions, recentBudgets }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) return null;

    const expenseLines = currentMonthBudget?.lines?.filter((l) => !l.category.is_income) ?? [];
    const totalPlanned = expenseLines.reduce((sum, l) => sum + l.allocated_cents, 0);
    const totalSpent = expenseLines.reduce((sum, l) => sum + Math.abs(l.actual_cents), 0);
    const totalRemaining = totalPlanned - totalSpent;
    const overBudget = totalSpent > totalPlanned && totalPlanned > 0;

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-4">

                {/* Current month budget */}
                {currentMonthBudget ? (
                    <Card>
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle>{formatMonth(currentMonthBudget.month)}</CardTitle>
                            <Button asChild variant="outline" size="sm">
                                <Link href={budgetShow.url({ current_team: currentTeam.slug, budget: currentMonthBudget.id })}>
                                    View Budget
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Summary stats */}
                            {totalPlanned > 0 && (
                                <div className="space-y-2">
                                    <div className="flex gap-6 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Planned</p>
                                            <p className="font-semibold">{formatCurrency(totalPlanned)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Spent</p>
                                            <p className="font-semibold">{formatCurrency(totalSpent)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Remaining</p>
                                            <p className={`font-semibold ${overBudget ? 'text-destructive' : 'text-green-600'}`}>
                                                {overBudget ? '-' : ''}{formatCurrency(Math.abs(totalRemaining))}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
                                            style={{ width: '100%' }}
                                        />
                                        <div
                                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
                                            style={{ width: `${Math.min((totalSpent / totalPlanned) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Per-category breakdown */}
                            {currentMonthBudget.lines && currentMonthBudget.lines.length > 0 ? (
                                <div className="divide-y">
                                    {currentMonthBudget.lines.map((line) => {
                                        const spent = line.category.is_income ? line.actual_cents : Math.abs(line.actual_cents);
                                        const pct = line.allocated_cents > 0
                                            ? Math.min((spent / line.allocated_cents) * 100, 100)
                                            : 0;
                                        const over = !line.category.is_income && spent > line.allocated_cents && line.allocated_cents > 0;
                                        return (
                                            <div key={line.id} className="py-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        {line.category.color && (
                                                            <span
                                                                className="inline-block size-2.5 rounded-full"
                                                                style={{ backgroundColor: line.category.color }}
                                                            />
                                                        )}
                                                        <span>{line.category.name}</span>
                                                        {line.category.is_income && (
                                                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Income</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-right">
                                                        <span className="text-muted-foreground">{formatCurrency(spent)}</span>
                                                        <span className="w-20 text-right font-medium">{formatCurrency(line.allocated_cents)}</span>
                                                    </div>
                                                </div>
                                                {!line.category.is_income && line.allocated_cents > 0 && (
                                                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className={`h-full rounded-full ${over ? 'bg-destructive' : 'bg-primary'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">No budget lines yet.</p>
                                    <Button asChild size="sm">
                                        <Link href={budgetShow.url({ current_team: currentTeam.slug, budget: currentMonthBudget.id })}>
                                            Add Lines
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="flex items-center justify-between py-6">
                            <div>
                                <p className="font-medium">No budget for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                <p className="text-sm text-muted-foreground">Create one to start tracking your spending.</p>
                            </div>
                            <Button asChild>
                                <Link href={budgetCreate.url(currentTeam.slug)}>Create Budget</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent transactions */}
                    {recentTransactions.length > 0 && (
                        <Card>
                            <CardHeader className="flex-row items-center justify-between pb-2">
                                <CardTitle>Recent Transactions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ul className="divide-y">
                                    {recentTransactions.map((tx) => (
                                        <li key={tx.id} className="flex items-center justify-between px-6 py-3 text-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{tx.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{formatDate(tx.transacted_at)}</span>
                                                    {tx.category && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1">
                                                                {tx.category.color && (
                                                                    <span
                                                                        className="inline-block size-2 rounded-full"
                                                                        style={{ backgroundColor: tx.category.color }}
                                                                    />
                                                                )}
                                                                {tx.category.name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`ml-4 font-medium tabular-nums ${tx.amount_cents >= 0 ? 'text-green-600' : ''}`}>
                                                {formatCurrency(tx.amount_cents)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Past budgets */}
                    {recentBudgets.length > 0 && (
                        <Card>
                            <CardHeader className="flex-row items-center justify-between pb-2">
                                <CardTitle>Past Budgets</CardTitle>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={budgetsIndex.url(currentTeam.slug)}>View all</Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ul className="divide-y">
                                    {recentBudgets.map((budget) => (
                                        <li key={budget.id}>
                                            <Link
                                                href={budgetShow.url({ current_team: currentTeam.slug, budget: budget.id })}
                                                className="flex items-center justify-between px-6 py-3 text-sm hover:bg-muted/50"
                                            >
                                                <span className="font-medium">{formatMonth(budget.month)}</span>
                                                {budget.notes && (
                                                    <span className="truncate text-muted-foreground">{budget.notes}</span>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: props.currentTeam ? DashboardController(props.currentTeam.slug).url : '/',
        },
    ],
});
